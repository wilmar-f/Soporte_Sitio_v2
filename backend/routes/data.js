const express = require('express');
const router = express.Router();
const { getUsuarios, getInventario, getTemplate } = require('../controllers/dataController');

router.get('/usuarios', getUsuarios);
router.get('/inventario', getInventario);
router.get('/template', getTemplate);

module.exports = router;
