// Carga las variables de .env
require('dotenv').config();

const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_DATABASE,
    // fuerza a usar el esquema public
    options: "-c search_path=public"
});

pool.connect()
    .then(() => console.log('Conexión a PostgreSQL exitosa'))
    .catch(err => console.error('Error de conexión', err));

module.exports = pool;