const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const usuariosCSVPath = path.join(__dirname, '../data/usuarios.csv');
const inventarioCSVPath = path.join(__dirname, '../data/inventario.csv');
const templatePath = path.join(__dirname, '../templates/diagnostico.template.html');

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

// GET /api/inventario — lee inventario.csv y retorna [{serial, etiqueta}]
// El CSV usa delimitador ';' y encabezados: Nº serie;Etiqueta
exports.getInventario = (req, res) => {
  const results = [];
  fs.createReadStream(inventarioCSVPath, { encoding: 'utf8' })
    .pipe(
      csv({
        separator: ';',
        mapHeaders: ({ header, index }) => {
          if (index === 0) return 'serial';
          if (index === 1) return 'etiqueta';
          return header.trim();
        }
      })
    )
    .on('data', row => {
      if (row.serial) results.push({ serial: row.serial, etiqueta: row.etiqueta });
    })
    .on('end', () => res.json(results))
    .on('error', err => {
      console.error('Error leyendo inventario.csv:', err.message);
      res.status(500).json({ error: 'Error al leer datos de inventario' });
    });
};

// GET /api/template — retorna la plantilla HTML del diagnóstico como texto plano
exports.getTemplate = (req, res) => {
  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error leyendo template:', err.message);
      return res.status(500).json({ error: 'Error al leer la plantilla' });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
  });
};
