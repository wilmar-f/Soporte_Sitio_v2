const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { redactar } = require('../controllers/redactarController');

router.post('/redactar', authMiddleware, redactar);

module.exports = router;
