const jwt = require('jsonwebtoken');
const { findTecnicoByCedula } = require('../utils/readTecnicos');

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
