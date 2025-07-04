const express = require("express");
const cors = require("cors");
const pool = require("./database")
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

var app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
}));

const PORT = process.env.PORT || 3000;

// Clave secreta para generar JWT
const jwtSecret = 'secreto_del_token';
// Clave para cuenta google
/*const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('TU_CLIENT_ID_DE_WEB'); // Reemplaza con tu ID
//Ruta inicio con cuenta google
app.post('/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: 'TU_CLIENT_ID_DE_WEB',
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        // Verificar si el correo está en la base de datos
        const user = await User.findOne({ where: { email } });
        if (user) {
            const authToken = generarToken(user); // Función para generar tu token JWT
            res.status(200).json({ isRegistered: true, token: authToken });
        } else {
            res.status(200).json({ isRegistered: false });
        }
    } catch (error) {
        res.status(400).json({ error: 'Error al verificar el token de Google' });
    }
});
*/
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
            if(row.type === 'marker'){
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