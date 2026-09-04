const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const { getEstadisticas } = require('../controllers/estadisticasController');

router.get('/estadisticas', adminMiddleware, getEstadisticas);

module.exports = router;
