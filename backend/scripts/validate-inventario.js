/**
 * Audita la calidad de inventario.xlsx (misma lógica que la app).
 * Uso:
 *   node backend/scripts/validate-inventario.js
 *   node backend/scripts/validate-inventario.js --serial 8CC3151BHH
 *   node backend/scripts/validate-inventario.js --output ruta.csv
 *   node backend/scripts/validate-inventario.js --no-file
 */
const fs = require('fs');
const path = require('path');
const { reloadInventario } = require('../utils/readInventario');

const DEFAULT_REPORT = path.join(__dirname, '../data/reporte-validacion-inventario.csv');

const args = process.argv.slice(2);

function parseArgs(argv) {
  let serialFilter = null;
  let outputPath = DEFAULT_REPORT;
  let noFile = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--serial') {
      serialFilter = argv[i + 1]?.trim() || null;
      i++;
    } else if (arg === '--output') {
      outputPath = argv[i + 1]?.trim() || null;
      i++;
    } else if (arg === '--no-file') {
      noFile = true;
    } else {
      console.error(`Argumento desconocido: ${arg}`);
      console.error('Uso: node scripts/validate-inventario.js [--serial SERIAL] [--output ruta.csv] [--no-file]');
      process.exit(1);
    }
  }

  if (serialFilter === '') {
    console.error('Uso: node scripts/validate-inventario.js [--serial SERIAL] [--output ruta.csv] [--no-file]');
    process.exit(1);
  }

  if (outputPath === null || outputPath === '') {
    console.error('Debe indicar una ruta válida tras --output');
    process.exit(1);
  }

  return { serialFilter, outputPath, noFile };
}

function fmt(value) {
  const s = String(value ?? '').trim();
  return s || '(vacío)';
}

function escCsv(value) {
  const s = String(value ?? '');
  if (/[;"\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeReportCsv(filePath, rows) {
  const header = 'Serial;Etiqueta;Fabricante;Modelo;Problema;Detalle';
  const lines = rows.map(r =>
    [r.serial, r.etiqueta, r.fabricante, r.modelo, r.problema, r.detalle].map(escCsv).join(';')
  );
  const content = '\uFEFF' + [header, ...lines].join('\n') + '\n';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function addReport(reportRows, row, problema, detalle = '') {
  reportRows.push({
    serial: row.serial,
    etiqueta: row.etiqueta || '',
    fabricante: row.fabricante || '',
    modelo: row.modelo || '',
    problema,
    detalle,
  });
}

const { serialFilter, outputPath, noFile } = parseArgs(args);

try {
  const inventario = reloadInventario();

  if (serialFilter) {
    const needle = serialFilter.toLowerCase();
    const equipo = inventario.find(e => e.serial.toLowerCase() === needle);

    if (!equipo) {
      console.log(`Serial no encontrado: ${serialFilter}`);
      process.exit(1);
    }

    console.log(`\n--- Serial ${equipo.serial} ---`);
    console.log(`Etiqueta: ${fmt(equipo.etiqueta)}`);
    console.log(`Fabricante: ${fmt(equipo.fabricante)}`);
    console.log(`Modelo: ${fmt(equipo.modelo)}`);
    process.exit(0);
  }

  const sinEtiqueta = [];
  const etiquetaLongitud = [];
  const sinFabricante = [];
  const sinModelo = [];
  const serialMap = new Map();
  const reportRows = [];

  for (const row of inventario) {
    const { serial, etiqueta, fabricante, modelo } = row;

    if (!serialMap.has(serial)) {
      serialMap.set(serial, []);
    }
    serialMap.get(serial).push(row);

    if (!etiqueta) {
      sinEtiqueta.push(serial);
      addReport(reportRows, row, 'etiqueta_vacia');
    } else if (etiqueta.length !== 7) {
      etiquetaLongitud.push({ serial, etiqueta, len: etiqueta.length });
      addReport(reportRows, row, 'etiqueta_longitud', `longitud=${etiqueta.length}`);
    }

    if (!fabricante) {
      sinFabricante.push(serial);
      addReport(reportRows, row, 'sin_fabricante');
    }
    if (!modelo) {
      sinModelo.push(serial);
      addReport(reportRows, row, 'sin_modelo');
    }
  }

  const duplicados = [...serialMap.entries()].filter(([, rows]) => rows.length > 1);
  for (const [serial, rows] of duplicados) {
    addReport(reportRows, rows[0], 'serial_duplicado', `${rows.length} filas duplicadas`);
  }

  console.log(`\n=== Validación inventario.xlsx ===\n`);
  console.log(`Total equipos: ${inventario.length}`);
  console.log(`Etiqueta vacía: ${sinEtiqueta.length}`);
  console.log(`Etiqueta longitud ≠ 7: ${etiquetaLongitud.length} (advertencia)`);
  console.log(`Sin fabricante: ${sinFabricante.length}`);
  console.log(`Sin modelo: ${sinModelo.length}`);
  console.log(`Seriales duplicados: ${duplicados.length}`);

  if (sinEtiqueta.length > 0) {
    console.log(`\n--- Primeros 20 sin etiqueta ---`);
    sinEtiqueta.slice(0, 20).forEach(s => console.log(`  ${s}`));
    if (sinEtiqueta.length > 20) {
      console.log(`  ... y ${sinEtiqueta.length - 20} más`);
    }
  }

  if (duplicados.length > 0) {
    console.log(`\n--- Seriales duplicados ---`);
    duplicados.slice(0, 10).forEach(([serial, rows]) => {
      console.log(`  ${serial} (${rows.length} filas)`);
    });
    if (duplicados.length > 10) {
      console.log(`  ... y ${duplicados.length - 10} más`);
    }
  }

  if (!noFile && reportRows.length > 0) {
    writeReportCsv(outputPath, reportRows);
    console.log(`\nReporte detallado (${reportRows.length} filas): ${outputPath}`);
  }

  const hasIssues =
    sinEtiqueta.length > 0 ||
    sinFabricante.length > 0 ||
    sinModelo.length > 0 ||
    duplicados.length > 0;

  console.log('');
  if (hasIssues) {
    console.log('Resultado: se encontraron problemas de calidad en el inventario.');
    process.exit(1);
  }

  console.log('Resultado: inventario OK (etiqueta longitud ≠ 7 es solo advertencia).');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
