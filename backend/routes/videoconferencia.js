const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getSalas, getStatus, upload } = require('../controllers/videoconferenciaController');

router.get('/videoconferencia/salas', authMiddleware, getSalas);
router.get('/videoconferencia/status', authMiddleware, getStatus);
router.post('/videoconferencia/upload', authMiddleware, upload);

module.exports = router;
