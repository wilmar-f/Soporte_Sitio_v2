const {
  listTecnicosSeguro,
  adminResetContrasena,
  normalizeCedula,
} = require('../utils/readTecnicos');
const { MIN_PASSWORD_LENGTH, validarComplejidadContrasena } = require('../utils/passwordPolicy');

const MAX_RESULTS = 50;

function normalizeSearch(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function handleWriteError(res, err) {
  const cause = err.cause;
  console.error('Error restableciendo contraseña (escritura):', cause?.message || err.message, cause?.code || '');
  const locked = cause?.code === 'EPERM' || cause?.code === 'EBUSY' || cause?.code === 'EACCES';
  if (locked) {
    return res.status(500).json({
      error: 'No se pudo guardar la contraseña. Verifique que el archivo tecnicos.xlsx no esté abierto en Excel e intente de nuevo.',
    });
  }
  return res.status(500).json({ error: 'No se pudo guardar la nueva contraseña' });
}

exports.listarTecnicos = (req, res) => {
  const q = normalizeSearch(req.query.q);

  try {
    let tecnicos = listTecnicosSeguro();

    if (q) {
      const qDigits = q.replace(/\D/g, '');
      tecnicos = tecnicos.filter((t) => {
        const matchNombre = normalizeSearch(t.nombreCompleto).includes(q);
        const matchCedula = qDigits && t.cedula.includes(qDigits);
        return matchNombre || matchCedula;
      });
    }

    tecnicos = tecnicos
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'))
      .slice(0, MAX_RESULTS);

    return res.json({ tecnicos, total: tecnicos.length });
  } catch (err) {
    console.error('Error listando técnicos:', err.message);
    return res.status(500).json({ error: 'Error interno al leer técnicos' });
  }
};

exports.resetContrasena = (req, res) => {
  const adminCedula = req.user?.cedula;
  const { cedula, contrasenaNueva, contrasenaConfirmacion } = req.body || {};

  if (!cedula || !contrasenaNueva || !contrasenaConfirmacion) {
    return res.status(400).json({ error: 'Complete cédula y campos de contraseña' });
  }

  if (contrasenaNueva !== contrasenaConfirmacion) {
    return res.status(400).json({ error: 'La nueva contraseña y la confirmación no coinciden' });
  }

  if (String(contrasenaNueva).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    });
  }

  const complejidad = validarComplejidadContrasena(contrasenaNueva);
  if (!complejidad.ok) {
    return res.status(400).json({ error: complejidad.error });
  }

  const cedulaNorm = normalizeCedula(cedula);
  if (!cedulaNorm) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  try {
    adminResetContrasena(cedulaNorm, contrasenaNueva);
    console.log(`Reset contraseña: admin ${adminCedula} → usuario ${cedulaNorm}`);
    return res.json({
      ok: true,
      mensaje: 'Contraseña restablecida. Comuníquela al técnico por un canal seguro.',
    });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (err.code === 'WRITE_ERROR') {
      return handleWriteError(res, err);
    }
    console.error('Error restableciendo contraseña:', err.message);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
};
