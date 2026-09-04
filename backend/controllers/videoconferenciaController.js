const { getCatalogo, existeSedeSala } = require('../utils/readVideoconferencia');
const {
  isConfigured,
  guardarFotoVideoconferencia,
  FotoYaExisteError,
} = require('../services/oneDrivePersonalService');

const MAX_BYTES = 5 * 1024 * 1024;

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) return null;
  return { mime: match[1], buffer };
}

exports.getSalas = (req, res) => {
  try {
    res.json({ sedes: getCatalogo(), onedriveConfigurado: isConfigured() });
  } catch (err) {
    res.status(500).json({ error: err.message || 'No se pudo leer el catálogo de salas' });
  }
};

exports.getStatus = (_req, res) => {
  res.json({ onedriveConfigurado: isConfigured() });
};

exports.upload = async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'OneDrive no está configurado. Faltan credenciales en el servidor.',
      });
    }

    const sede = String(req.body?.sede || '').trim();
    const sala = String(req.body?.sala || '').trim();
    const reemplazar = Boolean(req.body?.reemplazar);
    const imagenBase64 = req.body?.imagenBase64;

    if (!sede || !sala) {
      return res.status(400).json({ error: 'Sede y sala de videoconferencia son obligatorias' });
    }
    if (!existeSedeSala(sede, sala)) {
      return res.status(400).json({ error: 'La sede o sala no existe en el catálogo de videoconferencia' });
    }

    const decoded = decodeDataUrl(imagenBase64);
    if (!decoded) {
      return res.status(400).json({ error: 'La imagen no es válida' });
    }
    if (decoded.buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: 'La imagen supera el máximo de 5 MB' });
    }

    const result = await guardarFotoVideoconferencia({
      sede,
      sala,
      buffer: decoded.buffer,
      reemplazar,
    });

    res.json({
      ok: true,
      mensaje: reemplazar ? 'Foto reemplazada en OneDrive' : 'Foto guardada en OneDrive',
      ...result,
    });
  } catch (err) {
    if (err instanceof FotoYaExisteError) {
      return res.status(409).json({
        error: 'Ya existe una foto de hoy para esta sede y sala',
        filename: err.filename,
        existe: true,
      });
    }
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({ error: err.message || 'No se pudo guardar la foto' });
  }
};
