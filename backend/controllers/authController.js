const jwt = require('jsonwebtoken');
const { findTecnicoByCedula, updateContrasena } = require('../utils/readTecnicos');

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_COMPLEXITY_MSG =
  'La nueva contraseña debe tener al menos 6 caracteres, una letra mayúscula, un número y un carácter especial (. * + -).';

function validarComplejidadContrasena(contrasena) {
  const pwd = String(contrasena);
  const valid =
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[.*+\-]/.test(pwd);
  return valid ? { ok: true } : { ok: false, error: PASSWORD_COMPLEXITY_MSG };
}

exports.login = (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Cédula y contraseña son requeridos' });
  }

  let tecnico;
  try {
    tecnico = findTecnicoByCedula(usuario, contrasena);
  } catch (err) {
    console.error('Error leyendo tecnicos.xlsx:', err.message);
    return res.status(500).json({ error: 'Error interno al leer técnicos' });
  }

  if (!tecnico) {
    return res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
  }

  const secret = process.env.JWT_SECRET || 'secret_dev_fallback';
  const token = jwt.sign(
    { cedula: tecnico.cedula, rol: tecnico.rol },
    secret,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    usuario: {
      cedula: tecnico.cedula,
      nombreCompleto: tecnico.nombreCompleto,
      cargo: tecnico.cargo,
      rol: tecnico.rol,
    },
  });
};

exports.cambiarContrasena = (req, res) => {
  const cedula = req.user?.cedula;
  const { contrasenaActual, contrasenaNueva, contrasenaConfirmacion } = req.body || {};

  if (!cedula) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  if (!contrasenaActual || !contrasenaNueva || !contrasenaConfirmacion) {
    return res.status(400).json({ error: 'Complete todos los campos de contraseña' });
  }

  if (contrasenaNueva !== contrasenaConfirmacion) {
    return res.status(400).json({ error: 'La nueva contraseña y la confirmación no coinciden' });
  }

  if (String(contrasenaNueva).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
  }

  const complejidad = validarComplejidadContrasena(contrasenaNueva);
  if (!complejidad.ok) {
    return res.status(400).json({ error: complejidad.error });
  }

  if (contrasenaNueva === contrasenaActual) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
  }

  try {
    updateContrasena(cedula, contrasenaActual, contrasenaNueva);
    return res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    if (err.code === 'INVALID_PASSWORD') {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (err.code === 'WRITE_ERROR') {
      const cause = err.cause;
      console.error('Error cambiando contraseña (escritura):', cause?.message || err.message, cause?.code || '');
      const locked = cause?.code === 'EPERM' || cause?.code === 'EBUSY' || cause?.code === 'EACCES';
      if (locked) {
        return res.status(500).json({
          error: 'No se pudo guardar la contraseña. Verifique que el archivo tecnicos.xlsx no esté abierto en Excel e intente de nuevo.',
        });
      }
      return res.status(500).json({ error: 'No se pudo guardar la nueva contraseña' });
    }
    console.error('Error cambiando contraseña:', err.message);
    return res.status(500).json({ error: 'No se pudo guardar la nueva contraseña' });
  }
};
