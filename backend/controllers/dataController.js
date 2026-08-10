const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { reloadInventario } = require('../utils/readInventario');

const usuariosCSVPath = path.join(__dirname, '../data/usuarios.csv');

// GET /api/usuarios — lee usuarios.csv y retorna [{cedula, nombreUsuario}]
// El CSV usa delimitador ';' y encabezados: Cedula;Nombre Usuario
// Los datos se re-leen del disco en cada petición para permitir actualizaciones sin reiniciar.
exports.getUsuarios = (req, res) => {
  const results = [];
  fs.createReadStream(usuariosCSVPath, { encoding: 'utf8' })
    .pipe(
      csv({
        separator: ';',
        mapHeaders: ({ header, index }) => {
          if (index === 0) return 'cedula';
          if (index === 1) return 'nombreUsuario';
          return header.trim();
        }
      })
    )
    .on('data', row => {
      if (row.cedula) results.push({ cedula: row.cedula, nombreUsuario: row.nombreUsuario });
    })
    .on('end', () => res.json(results))
    .on('error', err => {
      console.error('Error leyendo usuarios.csv:', err.message);
      res.status(500).json({ error: 'Error al leer datos de usuarios' });
    });
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
