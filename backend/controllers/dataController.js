const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const usuariosCSVPath = path.join(__dirname, '../data/usuarios.csv');
const inventarioCSVPath = path.join(__dirname, '../data/inventario.csv');

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

// GET /api/inventario — lee inventario.csv y retorna [{serial, etiqueta, fabricante, modelo}]
// El CSV usa delimitador ';' y encabezados: Nº serie;Etiqueta;Fabricante;Modelo
exports.getInventario = (req, res) => {
  const results = [];
  fs.createReadStream(inventarioCSVPath, { encoding: 'utf8' })
    .pipe(
      csv({
        separator: ';',
        mapHeaders: ({ header, index }) => {
          if (index === 0) return 'serial';
          if (index === 1) return 'etiqueta';
          if (index === 2) return 'fabricante';
          if (index === 3) return 'modelo';
          return header.trim();
        }
      })
    )
    .on('data', row => {
      if (row.serial) {
        results.push({
          serial: row.serial,
          etiqueta: row.etiqueta || '',
          fabricante: row.fabricante || '',
          modelo: row.modelo || '',
        });
      }
    })
    .on('end', () => res.json(results))
    .on('error', err => {
      console.error('Error leyendo inventario.csv:', err.message);
      res.status(500).json({ error: 'Error al leer datos de inventario' });
    });
};
