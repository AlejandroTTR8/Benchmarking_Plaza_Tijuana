const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json()); // Permite recibir datos en formato JSON
app.use(express.static(path.join(__dirname, 'public'))); // Sirve tu página web

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Requerido por Railway
});

// Ruta para probar que el servidor funciona
app.get('/api/status', (req, res) => {
  res.json({ mensaje: 'Servidor conectado correctamente' });
});

// Ruta para GUARDAR un nuevo registro desde el formulario web
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
    res.status(201).json({ mensaje: 'Registro guardado exitosamente', data: result.rows[0] });

  } catch (error) {
    console.error('Error al guardar:', error);
    res.status(500).json({ error: 'Hubo un error al guardar en la base de datos' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
