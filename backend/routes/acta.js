const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { generarPdfActa, getActasPersonas } = require('../controllers/actaPdfController');

router.get('/actas-personas', authMiddleware, getActasPersonas);
router.post('/generar-pdf-acta', authMiddleware, generarPdfActa);

module.exports = router;
