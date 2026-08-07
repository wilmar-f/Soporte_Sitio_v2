const express = require('express');
const router = express.Router();
const { getUsuarios, getInventario } = require('../controllers/dataController');

router.get('/usuarios', getUsuarios);
router.get('/inventario', getInventario);

module.exports = router;
