const { generarPdfDiagnostico } = require('../services/pdfService');
const { CAMPOS_TEXTO } = require('../utils/renderDiagnostico');

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

    const pdfBuffer = await generarPdfDiagnostico(datos);

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
