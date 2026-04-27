const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Conexión PostgreSQL ───────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Crear tabla automáticamente si no existe ──────────────────────────────
async function inicializarDB() {
  const query = `
    CREATE TABLE IF NOT EXISTS capturas (
      id                       SERIAL PRIMARY KEY,
      tipologia                TEXT,
      municipio                TEXT,
      zona                     TEXT,
      segmento                 TEXT,
      subsegmento              TEXT,
      desarrollador            TEXT,
      fraccionamiento          TEXT,
      prototipo                TEXT,
      estatus                  TEXT DEFAULT 'ACTIVO',
      precio_lista             NUMERIC,
      m2_construidos           NUMERIC,
      m2_habitables            NUMERIC,
      m2_terreno               NUMERIC,
      mts_frente               NUMERIC,
      mts_fondo                NUMERIC,
      precio_excedente_terreno NUMERIC,
      niveles                  INTEGER,
      recamaras                INTEGER,
      banos                    NUMERIC,
      huellas_estacionamiento  INTEGER,
      alcoba                   BOOLEAN DEFAULT false,
      walk_in_closet           BOOLEAN DEFAULT false,
      bano_rec_ppal            BOOLEAN DEFAULT false,
      terraza_balcon           BOOLEAN DEFAULT false,
      estancia_tv              BOOLEAN DEFAULT false,
      estudio                  BOOLEAN DEFAULT false,
      alacena                  BOOLEAN DEFAULT false,
      area_guardado            BOOLEAN DEFAULT false,
      cuarto_lavanderia        BOOLEAN DEFAULT false,
      roof_garden              BOOLEAN DEFAULT false,
      cochera_techada          BOOLEAN DEFAULT false,
      created_at               TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log('✅ Tabla capturas lista');
}

// ─── Helper: parsear booleanos desde Excel o formulario ───────────────────
function parseBool(val) {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'boolean') return val;
  const str = String(val).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'si' || str === 'sí' || str === 'yes';
}

// ─── Helper: parsear número, devuelve null si no es válido ─────────────────
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

// ─── Helper: parsear entero ────────────────────────────────────────────────
function parseInt2(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

// ─── Helper: texto limpio ──────────────────────────────────────────────────
function txt(val) {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim();
}

// ─── INSERT reutilizable ───────────────────────────────────────────────────
async function insertarCaptura(d) {
  const query = `
    INSERT INTO capturas (
      tipologia, municipio, zona, segmento, subsegmento, desarrollador,
      fraccionamiento, prototipo, estatus,
      precio_lista, m2_construidos, m2_habitables, m2_terreno,
      mts_frente, mts_fondo, precio_excedente_terreno,
      niveles, recamaras, banos, huellas_estacionamiento,
      alcoba, walk_in_closet, bano_rec_ppal, terraza_balcon,
      estancia_tv, estudio, alacena, area_guardado,
      cuarto_lavanderia, roof_garden, cochera_techada
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
    ) RETURNING *;
  `;
  const values = [
    txt(d.tipologia), txt(d.municipio), txt(d.zona), txt(d.segmento),
    txt(d.subsegmento), txt(d.desarrollador), txt(d.fraccionamiento),
    txt(d.prototipo), txt(d.estatus) || 'ACTIVO',
    parseNum(d.precio_lista), parseNum(d.m2_construidos), parseNum(d.m2_habitables),
    parseNum(d.m2_terreno), parseNum(d.mts_frente), parseNum(d.mts_fondo),
    parseNum(d.precio_excedente_terreno),
    parseInt2(d.niveles), parseInt2(d.recamaras), parseNum(d.banos),
    parseInt2(d.huellas_estacionamiento),
    parseBool(d.alcoba), parseBool(d.walk_in_closet), parseBool(d.bano_rec_ppal),
    parseBool(d.terraza_balcon), parseBool(d.estancia_tv), parseBool(d.estudio),
    parseBool(d.alacena), parseBool(d.area_guardado), parseBool(d.cuarto_lavanderia),
    parseBool(d.roof_garden), parseBool(d.cochera_techada),
  ];
  return pool.query(query, values);
}

// ═══════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════

// ─── Estado del servidor ───────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', hora: r.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'Error', error: err.message });
  }
});

// ─── Contador total ────────────────────────────────────────────────────────
app.get('/api/stats/count', async (req, res) => {
  try {
    const r = await pool.query('SELECT COUNT(*) FROM capturas');
    res.json({ total: parseInt(r.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Guardar captura manual ────────────────────────────────────────────────
app.post('/api/capturas', async (req, res) => {
  try {
    const result = await insertarCaptura(req.body);
    res.status(201).json({ mensaje: 'Guardado con éxito', data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/capturas]', err.message);
    res.status(500).json({ error: 'Error al guardar', detalle: err.message });
  }
});

// ─── Obtener todos los registros ───────────────────────────────────────────
app.get('/api/registros', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM capturas ORDER BY id DESC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Importar Excel — ahora SÍ inserta en la DB ───────────────────────────
app.post('/api/importar', upload.single('archivoExcel'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }

  try {
    // Leer el Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const filas = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!filas.length) {
      return res.status(400).json({ error: 'El Excel está vacío o no tiene datos.' });
    }

    // Normalizar nombres de columna (quitar espacios, minúsculas)
    function normKey(k) {
      return String(k).trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
        .replace(/[íì]/g, 'i').replace(/[óò]/g, 'o')
        .replace(/[úù]/g, 'u').replace(/ñ/g, 'n');
    }

    let insertados = 0;
    let errores    = 0;
    const detalles = [];

    for (let i = 0; i < filas.length; i++) {
      // Normalizar claves de la fila
      const rawFila = filas[i];
      const fila = {};
      Object.keys(rawFila).forEach(k => { fila[normKey(k)] = rawFila[k]; });

      try {
        // Mapear columnas del Excel a campos de la DB
        // Acepta variantes comunes de nombres de columna
        const dato = {
          tipologia:                fila.tipologia,
          municipio:                fila.municipio,
          zona:                     fila.zona || fila.delegacion || fila.zona_delegacion,
          segmento:                 fila.segmento,
          subsegmento:              fila.subsegmento,
          desarrollador:            fila.desarrollador,
          fraccionamiento:          fila.fraccionamiento,
          prototipo:                fila.prototipo,
          estatus:                  fila.estatus || 'ACTIVO',
          precio_lista:             fila.precio_lista || fila.precio || fila.valor,
          m2_construidos:           fila.m2_construidos || fila.m2construidos,
          m2_habitables:            fila.m2_habitables  || fila.m2habitables,
          m2_terreno:               fila.m2_terreno     || fila.m2terreno,
          mts_frente:               fila.mts_frente     || fila.metros_frente,
          mts_fondo:                fila.mts_fondo      || fila.metros_fondo,
          precio_excedente_terreno: fila.precio_excedente_terreno || fila.precio_excedente,
          niveles:                  fila.niveles,
          recamaras:                fila.recamaras || fila.recamaras_,
          banos:                    fila.banos || fila.banos_,
          huellas_estacionamiento:  fila.huellas_estacionamiento || fila.estacionamiento,
          alcoba:                   fila.alcoba,
          walk_in_closet:           fila.walk_in_closet || fila.walkin_closet,
          bano_rec_ppal:            fila.bano_rec_ppal  || fila.bano_principal,
          terraza_balcon:           fila.terraza_balcon || fila.terraza,
          estancia_tv:              fila.estancia_tv,
          estudio:                  fila.estudio,
          alacena:                  fila.alacena,
          area_guardado:            fila.area_guardado,
          cuarto_lavanderia:        fila.cuarto_lavanderia || fila.lavanderia,
          roof_garden:              fila.roof_garden,
          cochera_techada:          fila.cochera_techada  || fila.cochera,
        };

        await insertarCaptura(dato);
        insertados++;
      } catch (rowErr) {
        errores++;
        if (detalles.length < 10) detalles.push(`Fila ${i + 2}: ${rowErr.message}`);
      }
    }

    res.json({
      ok: true,
      mensaje: `Importación completa: ${insertados} insertados, ${errores} con error.`,
      insertados,
      errores,
      detalles,
    });

  } catch (err) {
    console.error('[POST /api/importar]', err.message);
    res.status(500).json({ error: 'Error procesando el Excel: ' + err.message });
  }
});

// ─── Arranque ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
inicializarDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`)))
  .catch(err => { console.error('❌ Error DB:', err.message); process.exit(1); });
