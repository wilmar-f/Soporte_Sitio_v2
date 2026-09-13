require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const cors = require('cors');
const { bootstrapDataFiles } = require('./utils/dataPaths');

bootstrapDataFiles();

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const pdfRoutes = require('./routes/pdf');
const diagnosticosRoutes = require('./routes/diagnosticos');
const adminRoutes = require('./routes/admin');
const videoconferenciaRoutes = require('./routes/videoconferencia');
const estadisticasRoutes = require('./routes/estadisticas');
const redactarRoutes = require('./routes/redactar');
const actaRoutes = require('./routes/acta');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Serve front-end static files
app.use(express.static(path.join(__dirname, '../front')));

// API routes
app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api', pdfRoutes);
app.use('/api', diagnosticosRoutes);
app.use('/api', adminRoutes);
app.use('/api', videoconferenciaRoutes);
app.use('/api', estadisticasRoutes);
app.use('/api', redactarRoutes);
app.use('/api', actaRoutes);

// Root redirect to login page
app.get('/', (req, res) => {
  res.redirect('/pages/index.html');
});

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  setImmediate(() => {
    try {
      const { getActasPersonas } = require('./utils/readActasPersonas');
      const n = getActasPersonas().length;
      console.log(`Actas.xlsx: ${n} personas en caché`);
    } catch (err) {
      console.warn('No se pudo precargar Actas.xlsx:', err.message);
    }
  });
});
