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



// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, jwtSecret);
        req.userEmail = decoded.email;
        next();
    } catch (error) {
        console.error('Error verificando token:', error);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// Endpoint para obtener estadísticas
app.get("/estadisticas", verifyToken, async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query
        const userEmail = req.userEmail

        // Construir condiciones de fecha
        let dateCondition = ""
        const queryParams = [userEmail]

        if (fechaInicio && fechaFin) {
            dateCondition = " AND inicio_en >= $2 AND inicio_en <= $3"
            queryParams.push(fechaInicio, fechaFin)
        }

        // Consulta principal de estadísticas usando tu tabla historial
        const statsQuery = `
            SELECT 
                COUNT(*) as total_viajes,
                COALESCE(SUM(distancia_km), 0) as kilometros_recorridos,
                COALESCE(SUM(EXTRACT(EPOCH FROM tiempo_fin)/60), 0) as tiempo_ahorrado,
                COUNT(CASE WHEN estado = 'completado' THEN 1 END) as viajes_completados,
                COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as viajes_cancelados,
                COUNT(CASE WHEN encontro_estacionamiento = true THEN 1 END) as viajes_con_parking,
                COUNT(CASE WHEN encontro_estacionamiento = false THEN 1 END) as viajes_sin_parking
            FROM historial 
            WHERE email_usuario = $1 ${dateCondition}
        `

        const statsResult = await pool.query(statsQuery, queryParams)
        const stats = statsResult.rows[0]

        // Consulta para gráfico semanal (últimos 7 días)
        const weeklyQuery = `
            SELECT 
                EXTRACT(DOW FROM inicio_en) as dia_semana,
                COUNT(*) as cantidad
            FROM historial 
            WHERE email_usuario = $1 
            AND inicio_en >= NOW() - INTERVAL '7 days'
            GROUP BY EXTRACT(DOW FROM inicio_en)
            ORDER BY dia_semana
        `

        const weeklyResult = await pool.query(weeklyQuery, [userEmail])

        // Convertir a array de 7 días (Lunes=0, Domingo=6)
        const viajesPorDia = [0, 0, 0, 0, 0, 0, 0]
        weeklyResult.rows.forEach((row) => {
            // PostgreSQL: 0=Domingo, 1=Lunes, ..., 6=Sábado
            // Convertir a: 0=Lunes, 1=Martes, ..., 6=Domingo
            const diaIndex = row.dia_semana === 0 ? 6 : row.dia_semana - 1
            viajesPorDia[diaIndex] = Number.parseInt(row.cantidad)
        })

        // Consulta para mapa de calor usando tu geometría PostGIS
        const heatmapQuery = `
            SELECT 
                ST_Y(destino) as latitude,
                ST_X(destino) as longitude,
                COUNT(*) as weight
            FROM historial 
            WHERE email_usuario = $1 
            AND destino IS NOT NULL 
            ${dateCondition}
            GROUP BY destino
            ORDER BY weight DESC
            LIMIT 50
        `

        const heatmapResult = await pool.query(heatmapQuery, queryParams)
        const heatmapData = heatmapResult.rows.map((row) => ({
            latitude: Number.parseFloat(row.latitude),
            longitude: Number.parseFloat(row.longitude),
            weight: Math.min(Number.parseInt(row.weight) / 10, 1), // Normalizar peso
        }))

        // Respuesta final
        res.json({
            success: true,
            estadisticas: {
                totalViajes: Number.parseInt(stats.total_viajes),
                kilometrosRecorridos: Number.parseFloat(stats.kilometros_recorridos),
                tiempoAhorrado: Number.parseInt(stats.tiempo_ahorrado),
                viajesCompletados: Number.parseInt(stats.viajes_completados),
                viajesCancelados: Number.parseInt(stats.viajes_cancelados),
                viajesConParking: Number.parseInt(stats.viajes_con_parking),
                viajesSinParking: Number.parseInt(stats.viajes_sin_parking),
            },
            graficos: {
                viajesPorDia: viajesPorDia,
                heatmapData: heatmapData,
            },
        })
    } catch (error) {
        console.error("Error obteniendo estadísticas:", error)

        // En caso de error, devolver estructura vacía pero válida
        res.json({
            success: true,
            estadisticas: {
                totalViajes: 0,
                kilometrosRecorridos: 0,
                tiempoAhorrado: 0,
                viajesCompletados: 0,
                viajesCancelados: 0,
                viajesConParking: 0,
                viajesSinParking: 0,
            },
            graficos: {
                viajesPorDia: [0, 0, 0, 0, 0, 0, 0],
                heatmapData: [],
            },
        })
    }
})

// 1. ENDPOINT: Iniciar viaje (desde ConfirmarRecorridoScreen)
app.post("/viajes/iniciar", verifyToken, async (req, res) => {
    try {
        const {
            origen_lat,
            origen_lng,
            destino_lat,
            destino_lng,
            trayectoria_coords, // Array de coordenadas de la ruta planificada
            distancia_estimada,
        } = req.body

        const userEmail = req.userEmail

        // Validar datos requeridos
        if (!origen_lat || !origen_lng || !destino_lat || !destino_lng) {
            return res.status(400).json({
                success: false,
                message: "Coordenadas de origen y destino son requeridas",
            })
        }

        // Crear geometrías PostGIS
        const origenPoint = `POINT(${origen_lng} ${origen_lat})`
        const destinoPoint = `POINT(${destino_lng} ${destino_lat})`

        // Crear trayectoria si se proporcionó
        let trayectoriaLineString = null
        if (trayectoria_coords && Array.isArray(trayectoria_coords) && trayectoria_coords.length > 1) {
            const coordsString = trayectoria_coords.map((coord) => `${coord.longitude} ${coord.latitude}`).join(",")
            trayectoriaLineString = `LINESTRING(${coordsString})`
        }

        const query = `
            INSERT INTO historial (
                email_usuario,
                origen,
                destino,
                trayectoria,
                inicio_en,
                estado,
                distancia_km,
                encontro_estacionamiento
            ) VALUES (
                $1,
                ST_GeomFromText($2, 4326),
                ST_GeomFromText($3, 4326),
                ${trayectoriaLineString ? "ST_GeomFromText($4, 4326)" : "NULL"},
                NOW(),
                'completado',
                $${trayectoriaLineString ? "5" : "4"},
                true
            ) RETURNING id_viaje
        `

        const params = [userEmail, origenPoint, destinoPoint]

        if (trayectoriaLineString) {
            params.push(trayectoriaLineString)
        }

        params.push(distancia_estimada || 0)

        const result = await pool.query(query, params)
        const viajeId = result.rows[0].id_viaje

        res.json({
            success: true,
            message: "Viaje iniciado exitosamente",
            viaje_id: viajeId,
        })
    } catch (error) {
        console.error("Error iniciando viaje:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        })
    }
})

// 2. ENDPOINT: Actualizar distancia durante navegación
app.put("/viajes/:viaje_id/actualizar-distancia", verifyToken, async (req, res) => {
    try {
        const { viaje_id } = req.params
        const { distancia_recorrida } = req.body

        const userEmail = req.userEmail

        // Verificar que el viaje pertenece al usuario
        const verificarQuery = `
            SELECT id_viaje FROM historial 
            WHERE id_viaje = $1 AND email_usuario = $2 AND estado = 'completado'
        `

        const verificarResult = await pool.query(verificarQuery, [viaje_id, userEmail])

        if (verificarResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Viaje no encontrado o no pertenece al usuario",
            })
        }

        // Actualizar distancia
        const updateQuery = `
            UPDATE historial 
            SET distancia_km = $1
            WHERE id_viaje = $2 AND email_usuario = $3
        `

        await pool.query(updateQuery, [distancia_recorrida, viaje_id, userEmail])

        res.json({
            success: true,
            message: "Distancia actualizada exitosamente",
        })
    } catch (error) {
        console.error("Error actualizando distancia:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        })
    }
})

// 3. ENDPOINT: Iniciar búsqueda de estacionamiento
app.post("/viajes/:viaje_id/buscar-estacionamiento", verifyToken, async (req, res) => {
    try {
        const { viaje_id } = req.params
        const { ubicacion_busqueda_lat, ubicacion_busqueda_lng } = req.body

        const userEmail = req.userEmail

        // Verificar que el viaje pertenece al usuario
        const verificarQuery = `
            SELECT id_viaje FROM historial 
            WHERE id_viaje = $1 AND email_usuario = $2 AND estado = 'completado'
        `

        const verificarResult = await pool.query(verificarQuery, [viaje_id, userEmail])

        if (verificarResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Viaje no encontrado o no pertenece al usuario",
            })
        }

        // Crear punto de ubicación inicial de búsqueda
        const ubicacionPoint = `POINT(${ubicacion_busqueda_lng} ${ubicacion_busqueda_lat})`

        const updateQuery = `
            UPDATE historial 
            SET 
                busqueda_iniciada = NOW(),
                ubicacion_inicial_busqueda = ST_GeomFromText($1, 4326),
                encontro_estacionamiento = false
            WHERE id_viaje = $2 AND email_usuario = $3
        `

        await pool.query(updateQuery, [ubicacionPoint, viaje_id, userEmail])

        res.json({
            success: true,
            message: "Búsqueda de estacionamiento iniciada",
        })
    } catch (error) {
        console.error("Error iniciando búsqueda de estacionamiento:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        })
    }
})

// 4. ENDPOINT: Finalizar viaje
app.post("/viajes/:viaje_id/finalizar", verifyToken, async (req, res) => {
    try {
        const { viaje_id } = req.params
        const {
            estado, // 'completado' o 'cancelado'
            distancia_final,
            encontro_lugar_busqueda, // true/false si encontró lugar durante búsqueda
            ubicacion_final_lat,
            ubicacion_final_lng,
            id_mapeado, // ID de la calle de estacionamiento seleccionada
            calle_estacionamiento, // Nombre de la calle
        } = req.body

        const userEmail = req.userEmail

        // Verificar que el viaje pertenece al usuario
        const verificarQuery = `
            SELECT id_viaje, busqueda_iniciada, encontro_estacionamiento FROM historial 
            WHERE id_viaje = $1 AND email_usuario = $2 AND estado = 'completado'
        `

        const verificarResult = await pool.query(verificarQuery, [viaje_id, userEmail])

        if (verificarResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Viaje no encontrado o no pertenece al usuario",
            })
        }

        const viaje = verificarResult.rows[0]

        // Crear punto de ubicación final si se proporcionó
        let ubicacionFinalPoint = null
        if (ubicacion_final_lat && ubicacion_final_lng) {
            ubicacionFinalPoint = `POINT(${ubicacion_final_lng} ${ubicacion_final_lat})`
        }

        // Construir query dinámicamente
        let updateQuery = `
            UPDATE historial 
            SET 
                fin_en = NOW(),
                estado = $1,
                distancia_km = $2
        `

        const params = [estado || "completado", distancia_final || 0]
        let paramIndex = 3

        // Si hubo búsqueda de estacionamiento, calcular tiempo_fin como INTERVAL
        if (viaje.busqueda_iniciada) {
            updateQuery += `, tiempo_fin = NOW() - busqueda_iniciada`
        }

        // Si se proporcionó ubicación final
        if (ubicacionFinalPoint) {
            updateQuery += `, ubicacion_final_busqueda = ST_GeomFromText($${paramIndex}, 4326)`
            params.push(ubicacionFinalPoint)
            paramIndex++
        }

        // Si se proporcionó información de estacionamiento
        if (encontro_lugar_busqueda !== undefined) {
            updateQuery += `, encontro_lugar_busqueda = $${paramIndex}`
            params.push(encontro_lugar_busqueda)
            paramIndex++
        }

        if (id_mapeado) {
            updateQuery += `, id_mapeado = $${paramIndex}`
            params.push(id_mapeado)
            paramIndex++
        }

        if (calle_estacionamiento) {
            updateQuery += `, calle_estacionamiento = $${paramIndex}`
            params.push(calle_estacionamiento)
            paramIndex++
        }

        updateQuery += ` WHERE id_viaje = $${paramIndex} AND email_usuario = $${paramIndex + 1}`
        params.push(viaje_id, userEmail)

        await pool.query(updateQuery, params)

        res.json({
            success: true,
            message: "Viaje finalizado exitosamente",
        })
    } catch (error) {
        console.error("Error finalizando viaje:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        })
    }
})

// 5. ENDPOINT: Obtener historial de viajes con datos de calles de estacionamiento
app.get("/viajes/historial", verifyToken, async (req, res) => {
    try {
        const userEmail = req.userEmail
        const { limite = 20, pagina = 1 } = req.query

        const offset = (pagina - 1) * limite

        const query = `
            SELECT 
                h.id_viaje,
                ST_Y(h.origen) as origen_lat,
                ST_X(h.origen) as origen_lng,
                ST_Y(h.destino) as destino_lat,
                ST_X(h.destino) as destino_lng,
                h.inicio_en,
                h.fin_en,
                h.estado,
                h.distancia_km,
                h.encontro_estacionamiento,
                h.busqueda_iniciada,
                EXTRACT(EPOCH FROM h.tiempo_fin)/60 as tiempo_busqueda_minutos,
                ST_Y(h.ubicacion_inicial_busqueda) as ubicacion_inicial_busqueda_lat,
                ST_X(h.ubicacion_inicial_busqueda) as ubicacion_inicial_busqueda_lng,
                ST_Y(h.ubicacion_final_busqueda) as ubicacion_final_busqueda_lat,
                ST_X(h.ubicacion_final_busqueda) as ubicacion_final_busqueda_lng,
                h.encontro_lugar_busqueda,
                h.id_mapeado,
                h.calle_estacionamiento,
                -- Datos de la calle de estacionamiento desde tabla mapeado
                m.restriction as tipo_estacionamiento,
                m.latlngs as coordenadas_calle
            FROM historial h
            LEFT JOIN mapeado m ON h.id_mapeado = m.id
            WHERE h.email_usuario = $1 AND h.estado IN ('completado', 'cancelado')
            ORDER BY h.inicio_en DESC
            LIMIT $2 OFFSET $3
        `

        const result = await pool.query(query, [userEmail, limite, offset])

        // Contar total de viajes
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM historial 
            WHERE email_usuario = $1 AND estado IN ('completado', 'cancelado')
        `

        const countResult = await pool.query(countQuery, [userEmail])
        const total = Number.parseInt(countResult.rows[0].total)

        res.json({
            success: true,
            viajes: result.rows,
            total: total,
            pagina: Number.parseInt(pagina),
            total_paginas: Math.ceil(total / limite),
        })
    } catch (error) {
        console.error("Error obteniendo historial:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        })
    }
})

// 6. ENDPOINT: Obtener estadísticas de estacionamiento por usuario
app.get("/viajes/estadisticas-estacionamiento", verifyToken, async (req, res) => {
    try {
        const userEmail = req.userEmail

        const query = `
            SELECT 
                COUNT(*) as total_viajes,
                COUNT(CASE WHEN encontro_estacionamiento = false THEN 1 END) as viajes_con_busqueda,
                COUNT(CASE WHEN encontro_estacionamiento = true THEN 1 END) as viajes_sin_busqueda,
                COUNT(CASE WHEN encontro_lugar_busqueda = true THEN 1 END) as busquedas_exitosas,
                COUNT(CASE WHEN encontro_lugar_busqueda = false THEN 1 END) as busquedas_fallidas,
                AVG(EXTRACT(EPOCH FROM tiempo_fin)/60) as tiempo_promedio_busqueda_minutos,
                -- Calles más utilizadas
                array_agg(DISTINCT calle_estacionamiento) FILTER (WHERE calle_estacionamiento IS NOT NULL) as calles_utilizadas,
                -- Tipos de estacionamiento más usados
                array_agg(DISTINCT m.restriction) FILTER (WHERE m.restriction IS NOT NULL) as tipos_estacionamiento_usados
            FROM historial h
            LEFT JOIN mapeado m ON h.id_mapeado = m.id
            WHERE h.email_usuario = $1 AND h.estado = 'completado'
        `

        const result = await pool.query(query, [userEmail])

        res.json({
            success: true,
            estadisticas: result.rows[0],
        })
    } catch (error) {
        console.error("Error obteniendo estadísticas:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        })
    }
})

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});