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
});
