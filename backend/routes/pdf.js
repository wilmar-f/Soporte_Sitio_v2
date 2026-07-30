const express = require('express');
const router = express.Router();
const { generarPdf } = require('../controllers/pdfController');

router.post('/generar-pdf', generarPdf);

module.exports = router;
