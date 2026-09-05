const { reloadInventario } = require('../utils/readInventario');
const { reloadUsuarios } = require('../utils/readUsuarios');

// GET /api/usuarios — lee usuarios.xlsx y retorna [{cedula, nombreUsuario}]
exports.getUsuarios = (req, res) => {
  try {
    res.json(reloadUsuarios());
  } catch (err) {
    console.error('Error leyendo usuarios.xlsx:', err.message);
    res.status(500).json({ error: 'Error al leer datos de usuarios' });
  }
};

// GET /api/inventario — lee inventario.xlsx y retorna [{serial, etiqueta, fabricante, modelo}]
exports.getInventario = (req, res) => {
  try {
    const results = reloadInventario();
    res.json(results);
  } catch (err) {
    console.error('Error leyendo inventario.xlsx:', err.message);
    res.status(500).json({ error: 'Error al leer datos de inventario' });
  }
};
