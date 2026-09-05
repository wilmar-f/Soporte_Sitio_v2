const { generarPdfDiagnostico } = require('../services/pdfService');
const { CAMPOS_TEXTO } = require('../utils/renderDiagnostico');
const { appendDiagnostico } = require('../utils/diagnosticosStore');

exports.generarPdf = async (req, res) => {
  try {
    const datos = {};
    for (const key of CAMPOS_TEXTO) {
      datos[key] = req.body[key] ?? '';
    }
    datos.firmaBase64 = req.body.firmaBase64 ?? '';
    datos.evidencias = Array.isArray(req.body.evidencias)
      ? req.body.evidencias.filter(src => typeof src === 'string' && src.startsWith('data:'))
      : [];

    if (typeof datos.firmaBase64 !== 'string' || !datos.firmaBase64.startsWith('data:')) {
      return res.status(400).json({ error: 'La firma es obligatoria. Dibújala o carga una imagen.' });
    }

    const pdfBuffer = await generarPdfDiagnostico(datos);

    try {
      appendDiagnostico({
        fecha: datos.fecha,
        nombreTecnico: datos.nombreTecnico,
        cedulaTecnico: datos.cedulaTecnico,
        tipoDiagnostico: req.body.tipoDiagnostico ?? '',
        serial: datos.serial,
        etiqueta: datos.etiqueta,
        sede: datos.sede ?? req.body.sede ?? '',
        sedeCodigo: req.body.sedeCodigo ?? '',
        ubicacionFisica: datos.ubicacionFisica ?? req.body.ubicacionFisica ?? '',
      });
    } catch (storeErr) {
      console.error('Error guardando historial de diagnóstico:', storeErr.message);
    }

    const cedula = String(datos.cedula || 'sin_cedula').replace(/\D/g, '') || 'sin_cedula';
    const fecha = String(datos.fecha || '').replace(/-/g, '') || 'sin_fecha';
    const filename = `diagnostico_${cedula}_${fecha}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({
      error: 'No se pudo generar el PDF. Intenta de nuevo en unos segundos.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
