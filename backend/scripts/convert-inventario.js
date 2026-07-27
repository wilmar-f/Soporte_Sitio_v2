/**
 * Convierte el export CSV de PCs_y_servidores (coma) a inventario.csv (punto y coma).
 * Uso: node backend/scripts/convert-inventario.js [ruta_origen.csv]
 */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const origen = process.argv[2] ||
  path.join('C:', 'Users', 'WILMAR', 'Documents', 'GitHub', 'DiagnosticoWeb', 'PCs_y_servidores_20260725200604.csv');
const destino = path.join(__dirname, '../data/inventario.csv');

const filas = [];

fs.createReadStream(origen, { encoding: 'utf8' })
  .pipe(
    csv({
      mapHeaders: ({ index }) => {
        if (index === 0) return 'etiqueta';
        if (index === 1) return 'serial';
        if (index === 4) return 'fabricante';
        if (index === 7) return 'modelo';
        return `col_${index}`;
      },
    })
  )
  .on('data', row => {
    const serial = (row.serial || '').trim();
    if (!serial) return;

    filas.push({
      serial,
      etiqueta: (row.etiqueta || '').trim(),
      fabricante: (row.fabricante || '').trim(),
      modelo: (row.modelo || '').trim(),
    });
  })
  .on('end', () => {
    const lineas = ['\uFEFFN\u00ba serie;Etiqueta;Fabricante;Modelo'];
    for (const f of filas) {
      const esc = (v) => String(v).replace(/;/g, ',');
      lineas.push(`${esc(f.serial)};${esc(f.etiqueta)};${esc(f.fabricante)};${esc(f.modelo)}`);
    }
    fs.writeFileSync(destino, lineas.join('\n') + '\n', 'utf8');
    console.log(`Convertidas ${filas.length} filas → ${destino}`);
  })
  .on('error', err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
