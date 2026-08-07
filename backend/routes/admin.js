const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const { listarTecnicos, resetContrasena } = require('../controllers/adminUsersController');

router.get('/admin/tecnicos', adminMiddleware, listarTecnicos);
router.post('/admin/reset-contrasena', adminMiddleware, resetContrasena);

module.exports = router;
