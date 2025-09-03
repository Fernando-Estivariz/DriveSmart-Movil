require('dotenv').config();
const express = require("express");
const cors = require("cors");
const pool = require("./database")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library')
const nodemailer = require('nodemailer');

var app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
}));

const PORT = process.env.PORT || 3000;

const jwtSecret = process.env.JWT_SECRET || "secreto_del_token";
const signToken = (payload) => jwt.sign(payload, jwtSecret, { expiresIn: "7d" });

// Google OAuth client (usa el WEB CLIENT ID)
const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

// ------------------------------------------------------------------
// SMTP / Email (Gmail o Thundermail)
// ------------------------------------------------------------------
const SMTP_PORT_NUM = parseInt(process.env.SMTP_PORT || "587", 10);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,                 
    port: SMTP_PORT_NUM,                         
    secure: SMTP_PORT_NUM === 465,               
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

transporter.verify((err) => {
    if (err) console.error('SMTP verify error:', err);
    else console.log('SMTP listo para enviar');
});

async function sendVerificationEmail(to, code) {
    try {
        const info = await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER, 
        to,
        subject: "Tu código de verificación - DriveSmart",
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 30px;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
                
                <div style="text-align: center;">
                <img src="https://raw.githubusercontent.com/Fernando-Estivariz/DriveSmart-Movil/ebd7abf302e74e38e7f75380225b5c59ed348603/server/assets/DRIVESMART.png" alt="DriveSmart" style="width: 120px; margin-bottom: 20px;" />
                <h2 style="color: #333;">Verificación de tu cuenta</h2>
                <p style="color: #555; font-size: 15px;">Gracias por registrarte en <b>DriveSmart</b>.  
                Ingresa este código en la app para confirmar tu correo electrónico:</p>
                
                <div style="margin: 20px 0; padding: 15px; background: #FF6B35; color: white; font-size: 30px; font-weight: bold; border-radius: 8px; letter-spacing: 8px;">
                    ${code}
                </div>

                <p style="color: #999; font-size: 13px;">
                    Este código expira en <b>10 minutos</b>.  
                    Si no solicitaste este registro, por favor ignora este correo.
                </p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="text-align: center; font-size: 12px; color: #aaa;">
                © ${new Date().getFullYear()} DriveSmart. Todos los derechos reservados.
                </p>
            </div>
            </div>
        `,
        });

        return info;
    } catch (err) {
        console.error("sendVerificationEmail error:", err);
        throw err;
    }
}


// ------------------------------------------------------------------
// OTP helpers y tabla temporal de pre-registro
// ------------------------------------------------------------------
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_LIMIT = 5;
const gen4 = () => Math.floor(1000 + Math.random() * 9000).toString();

// Crea tabla otp_requests si no existe (guarda datos previos al registro)
(async () => {
    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS otp_requests (
            email TEXT PRIMARY KEY,
            nombre_completo TEXT NOT NULL,
            numberphone TEXT,
            placa TEXT,
            password_hash TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            otp_expires TIMESTAMP NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            resend_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        `);
        console.log('Tabla otp_requests lista.');
    } catch (e) {
        console.error('Error creando tabla otp_requests:', e);
    }
})();

// ========================================================================
//                          RUTAS DE AUTENTICACIÓN
// ========================================================================

// /auth/google: valida idToken con Google y usa tu tabla user_mobile
// - Si existe el email -> emite JWT
// - Si no existe:
//    * modo estricto: responde 403
//    * modo auto-crear: inserta fila mínima y devuelve JWT
app.post('/auth/google', async (req, res) => {
    try {
        const { idToken, allowCreate = false } = req.body
        if (!idToken) return res.status(400).json({ message: 'Falta idToken' })

        // 1) Verificar token con Google
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_WEB_CLIENT_ID,
        })
        const payload = ticket.getPayload() // { email, email_verified, name, picture, sub, ... }

        if (!payload?.email || !payload?.email_verified) {
            return res.status(401).json({ message: 'Email de Google no verificado' })
        }

        const email = payload.email

        // 2) Buscar en tu BD
        const existing = await pool.query('SELECT * FROM user_mobile WHERE email = $1', [email])
        let user = existing.rows[0]

        // 3) Si no existe
        if (!user) {
            if (!allowCreate) {
                return res.status(403).json({ message: 'Usuario no registrado' })
            }
            // Auto-crear con datos disponibles
            const randomPwd = Math.random().toString(36).slice(2) // no se usará para login
            const hashed = await bcrypt.hash(randomPwd, 10)

            const nombre = payload.name || null
            const numberphone = null
            const placa = null

            const insert = await pool.query(
                'INSERT INTO user_mobile (nombre_completo, email, numberphone, placa, password) VALUES ($1,$2,$3,$4,$5) RETURNING *',
                [nombre, email, numberphone, placa, hashed]
            )
            user = insert.rows[0]
        }

        // 4) Emite tu JWT
        const token = signToken({ email: user.email })
        return res.json({
            token,
            user: {
                nombre_completo: user.nombre_completo,
                email: user.email,
                numberphone: user.numberphone,
                placa: user.placa,
            },
        })
    } catch (err) {
        console.error('Google Auth error:', err)
        return res.status(401).json({ message: 'Token de Google inválido' })
    }
})

/**
 * /auth/register/request-otp
 * Guarda datos del usuario + password hash en otp_requests y envía código al email.
 * NO crea usuario real todavía.
 */
app.post('/auth/register/request-otp', async (req, res) => {
    try {
        const { nombre_completo, email, numberphone, placa, password } = req.body;
        if (!nombre_completo || !email || !password) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const existing = await pool.query('SELECT 1 FROM user_mobile WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'El usuario ya existe' });
        }

        const code = gen4();
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
        const password_hash = await bcrypt.hash(password, 10);

        await pool.query(
        `INSERT INTO otp_requests (email, nombre_completo, numberphone, placa, password_hash, otp_code, otp_expires, attempts, resend_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,0,0)
        ON CONFLICT (email)
        DO UPDATE SET
            nombre_completo=EXCLUDED.nombre_completo,
            numberphone=EXCLUDED.numberphone,
            placa=EXCLUDED.placa,
            password_hash=EXCLUDED.password_hash,
            otp_code=EXCLUDED.otp_code,
            otp_expires=EXCLUDED.otp_expires,
            attempts=0,
            resend_count=0`,
        [email, nombre_completo, numberphone, placa, password_hash, code, expiresAt]
        );

        await sendVerificationEmail(email, code);
        return res.json({ message: 'Código enviado al correo' });
    } catch (err) {
        console.error('request-otp error:', err);
        return res.status(500).json({ message: 'Error enviando código' });
    }
});

/**
 * /auth/register/verify-otp
 * Verifica código y, si es correcto, crea el usuario en user_mobile y devuelve JWT.
 */
app.post('/auth/register/verify-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: 'Faltan email o código' });

        const existingUser = await pool.query('SELECT * FROM user_mobile WHERE email = $1', [email]);
        if (existingUser.rowCount > 0) {
        const token = signToken({ email });
        const u = existingUser.rows[0];
        return res.json({
            token,
            user: {
            nombre_completo: u.nombre_completo,
            email: u.email,
            numberphone: u.numberphone,
            placa: u.placa,
            },
        });
        }

        const { rows } = await pool.query('SELECT * FROM otp_requests WHERE email = $1', [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'No hay solicitud para este correo' });

        const r = rows[0];

        if (r.attempts >= MAX_ATTEMPTS) {
        return res.status(429).json({ message: 'Demasiados intentos, solicita un nuevo código' });
        }
        if (!r.otp_code || !r.otp_expires || new Date(r.otp_expires) < new Date()) {
        return res.status(400).json({ message: 'Código expirado o inválido' });
        }
        if (r.otp_code !== code) {
        await pool.query('UPDATE otp_requests SET attempts = attempts + 1 WHERE email = $1', [email]);
        return res.status(400).json({ message: 'Código incorrecto' });
        }

        const insert = await pool.query(
        `INSERT INTO user_mobile (nombre_completo, email, numberphone, placa, password)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING nombre_completo, email, numberphone, placa`,
        [r.nombre_completo, email, r.numberphone, r.placa, r.password_hash]
        );

        await pool.query('DELETE FROM otp_requests WHERE email = $1', [email]);

        const token = signToken({ email });
        return res.json({ token, user: insert.rows[0] });
    } catch (err) {
        console.error('verify-otp error:', err);
        return res.status(500).json({ message: 'Error verificando código' });
    }
});

/**
 * /auth/register/resend-otp
 * Reenvía un nuevo código (con límite), resetea attempts.
 */
app.post('/auth/register/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Falta email' });

        const { rows } = await pool.query('SELECT * FROM otp_requests WHERE email = $1', [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'No hay solicitud activa para este correo' });

        const r = rows[0];
        if (r.resend_count >= RESEND_LIMIT) {
            return res.status(429).json({ message: 'Límite de reenvíos alcanzado' });
        }

        const newCode = gen4();
        const newExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

        await pool.query(
            `UPDATE otp_requests
            SET otp_code=$1, otp_expires=$2, attempts=0, resend_count=resend_count+1
            WHERE email=$3`,
            [newCode, newExpires, email]
            );

            await sendVerificationEmail(email, newCode);
            return res.json({ message: 'Código reenviado' });
    } catch (err) {
        console.error('resend-otp error:', err);
        return res.status(500).json({ message: 'Error reenviando código' });
    }
});

// Ruta para el registro de usuario
app.post('/register', async (req, res) => {
    const { nombre_completo, email, numberphone, placa, password } = req.body;

    try {
        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar el nuevo usuario en la base de datos
        const newUser = await pool.query(
            'INSERT INTO user_mobile (nombre_completo, email, numberphone, placa, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre_completo, email, numberphone, placa, hashedPassword]
        );

        res.status(200).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error('Error en el registro:', error); // Agrega esta línea
        res.status(400).json({ message: 'Error en el registro', error: error.message }); // Modificado para dar más información
    }
});

// Ruta para el inicio de sesión
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Consultar el usuario en la base de datos
        const user = await pool.query('SELECT * FROM user_mobile WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const userInfo = user.rows[0];

        // Verificar la contraseña
        const isMatch = await bcrypt.compare(password, userInfo.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Generar un token JWT
        const token = jwt.sign({ email: userInfo.email }, jwtSecret, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
// Ruta para obtener el perfil del usuario autenticado
app.get('/get-profile', async (req, res) => {
    try {
        // Obtener el token desde el encabezado de la petición
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }

        // Verificar el token JWT
        const decoded = jwt.verify(token, jwtSecret);

        // Consultar el usuario en la base de datos usando el email decodificado
        const user = await pool.query('SELECT * FROM user_mobile WHERE email = $1', [decoded.email]);

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const userInfo = user.rows[0];
        res.json({
            nombre_completo: userInfo.nombre_completo,
            email: userInfo.email,
            numberphone: userInfo.numberphone,
            placa: userInfo.placa
        });
    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
    }
});
// Verificar Password
app.post('/verify-password', async (req, res) => {
    const { email, currentPassword } = req.body;
    try {
        const user = await pool.query('SELECT password FROM user_mobile WHERE email = $1', [email]);
        if (user.rowCount === 0) return res.status(404).json({ isValid: false });

        const isValid = await bcrypt.compare(currentPassword, user.rows[0].password);
        res.status(200).json({ isValid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en la verificación de la contraseña' });
    }
});
// Ruta para actualizar el perfil del usuario
app.put('/update-profile', async (req, res) => {
    const { nombre_completo, email, numberphone, placa, password } = req.body;

    try {
        let hashedPassword;
        // Si la contraseña fue proporcionada, encriptarla
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Construir la consulta de actualización
        let query = 'UPDATE user_mobile SET nombre_completo = $1, numberphone = $2, placa = $3';
        const params = [nombre_completo, numberphone, placa];

        // Si se ha proporcionado una nueva contraseña, actualizarla también
        if (hashedPassword) {
            query += ', password = $4';
            params.push(hashedPassword);
        }

        query += ' WHERE email = $5';
        params.push(email);

        // Ejecutar la consulta
        await pool.query(query, params);

        res.status(200).json({ message: 'Perfil actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        res.status(400).json({ message: 'Error al actualizar el perfil', error: error.message });
    }
});
// Ruta para cargar los datos de mapeado
app.get('/mapeado', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, type, ST_AsGeoJSON(geometry) as geometry, restriccion FROM mapeado');
        const mapeados = result.rows.map(row => {
            let latlngs;
            if (row.type === 'polygon') {
                latlngs = JSON.parse(row.geometry).coordinates[0][0].map(coord => [coord[1], coord[0]]);
            } else {
                latlngs = JSON.parse(row.geometry).coordinates[0].map(coord => [coord[1], coord[0]]);
            }
            if (row.type === 'marker') {
                latlngs = JSON.parse(row.geometry).coordinates;
            }
            return {
                id: row.id,
                type: row.type,
                latlngs: latlngs,
                restriction: row.restriccion // Agrega la restricción al objeto
            };
        });
        res.json(mapeados);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Error getting map data", error: err.message });
    }
});



app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});