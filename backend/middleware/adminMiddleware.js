const authMiddleware = require('./authMiddleware');

function normalizeRol(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Requiere JWT válido y rol administrador */
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const rol = normalizeRol(req.user?.rol);
    if (rol !== 'administrador') {
      return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    next();
  });
}

module.exports = adminMiddleware;
