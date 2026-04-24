const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); // Esto sirve tu index.html y app.js

// Configuración de conexión a PostgreSQL (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Obligatorio para Railway
});

// --- RUTA: Verificar estado del servidor ---
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'Conectado a PostgreSQL', servidor: 'OK', hora: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'Error de conexión', error: err.message });
  }
});

// --- RUTA: Guardar un nuevo registro (Captura) ---
app.post('/api/capturas', async (req, res) => {
  try {
    const { 
      tipologia, municipio, segmento, desarrollador, fraccionamiento, 
      precio_lista, m2_construidos, recamaras, banos, estatus 
    } = req.body;

    const query = `
      INSERT INTO capturas (
        tipologia, municipio, segmento, desarrollador, fraccionamiento, 
        precio_lista, m2_construidos, recamaras, banos, estatus
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    
    const values = [
      tipologia, municipio, segmento, desarrollador, fraccionamiento, 
      precio_lista, m2_construidos, recamaras, banos, estatus
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ mensaje: 'Guardado con éxito', data: result.rows[0] });

  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: 'Error interno al guardar los datos' });
  }
});

// --- RUTA: Obtener todos los registros (Para la tabla de Registros) ---
app.get('/api/registros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM capturas ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los registros' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});
