const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const { listarTecnicos } = require('../controllers/adminUsersController');

router.get('/admin/tecnicos', adminMiddleware, listarTecnicos);

module.exports = router;
