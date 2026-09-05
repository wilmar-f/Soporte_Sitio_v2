const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  listarTecnicos,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  resetContrasena,
} = require('../controllers/adminUsersController');

router.get('/admin/tecnicos', adminMiddleware, listarTecnicos);
router.post('/admin/tecnicos', adminMiddleware, crearUsuario);
router.put('/admin/tecnicos/:cedula', adminMiddleware, actualizarUsuario);
router.delete('/admin/tecnicos/:cedula', adminMiddleware, eliminarUsuario);
router.post('/admin/reset-contrasena', adminMiddleware, resetContrasena);

module.exports = router;
