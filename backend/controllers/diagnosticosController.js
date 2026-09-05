const { listDiagnosticos, getAniosDisponibles } = require('../utils/diagnosticosStore');

exports.listar = (req, res) => {
  try {
    const { q, anio, tipo, page, limit, desde, hasta, sede, tecnico } = req.query;
    const result = listDiagnosticos({ q, anio, tipo, page, limit, desde, hasta, sede, tecnico });
    const anios = getAniosDisponibles();
    res.json({ ...result, anios });
  } catch (err) {
    console.error('Error listando diagnósticos:', err.message);
    res.status(500).json({ error: 'No se pudo obtener el historial de diagnósticos' });
  }
};
