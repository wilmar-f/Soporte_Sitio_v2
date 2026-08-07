const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { login, cambiarContrasena } = require('../controllers/authController');

router.post('/login', login);
router.post('/cambiar-contrasena', authMiddleware, cambiarContrasena);

module.exports = router;
