const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const usuariosPath = path.join(__dirname, '../data/usuarios.json');

exports.login = (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  let usuarios;
  try {
    usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
  } catch {
    return res.status(500).json({ error: 'Error interno al leer usuarios' });
  }

  const user = usuarios.find(
    u => u.usuario === usuario && u.contraseña === contrasena
  );

  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const secret = process.env.JWT_SECRET || 'secret_dev_fallback';
  const token = jwt.sign(
    { id: user.id, usuario: user.usuario, rol: user.rol },
    secret,
    { expiresIn: '8h' }
  );

  // Exclude password from response
  const { contraseña, ...userData } = user;

  res.json({ token, usuario: userData });
};
