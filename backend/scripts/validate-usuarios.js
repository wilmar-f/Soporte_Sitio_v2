/**
 * Audita la calidad de usuarios.xlsx (todas las filas, incluida cédula vacía).
 * Uso:
 *   node backend/scripts/validate-usuarios.js
 *   node backend/scripts/validate-usuarios.js --cedula 12345678
 *   node backend/scripts/validate-usuarios.js --output ruta.csv
 *   node backend/scripts/validate-usuarios.js --no-file
 */
const fs = require('fs');
const path = require('path');
const { loadUsuariosRows } = require('../utils/readUsuarios');

const DEFAULT_REPORT = path.join(__dirname, '../data/reporte-validacion-usuarios.csv');

const args = process.argv.slice(2);

function parseArgs(argv) {
  let cedulaFilter = null;
  let outputPath = DEFAULT_REPORT;
  let noFile = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cedula') {
      cedulaFilter = argv[i + 1]?.trim() || null;
      i++;
    } else if (arg === '--output') {
      outputPath = argv[i + 1]?.trim() || null;
      i++;
    } else if (arg === '--no-file') {
      noFile = true;
    } else {
      console.error(`Argumento desconocido: ${arg}`);
      console.error('Uso: node scripts/validate-usuarios.js [--cedula CEDULA] [--output ruta.csv] [--no-file]');
      process.exit(1);
    }
  }

  if (cedulaFilter === '') {
    console.error('Uso: node scripts/validate-usuarios.js [--cedula CEDULA] [--output ruta.csv] [--no-file]');
    process.exit(1);
  }

  if (outputPath === null || outputPath === '') {
    console.error('Debe indicar una ruta válida tras --output');
    process.exit(1);
  }

  return { cedulaFilter, outputPath, noFile };
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
  const header = 'Cedula;NombreUsuario;Problema;Detalle';
  const lines = rows.map(r =>
    [r.cedula, r.nombreUsuario, r.problema, r.detalle].map(escCsv).join(';')
  );
  const content = '\uFEFF' + [header, ...lines].join('\n') + '\n';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function addReport(reportRows, row, problema, detalle = '') {
  reportRows.push({
    cedula: row.cedula || '',
    nombreUsuario: row.nombreUsuario || '',
    problema,
    detalle,
  });
}

const { cedulaFilter, outputPath, noFile } = parseArgs(args);

try {
  const usuarios = loadUsuariosRows();

  if (cedulaFilter) {
    const needle = cedulaFilter.replace(/\D/g, '') || cedulaFilter.toLowerCase();
    const usuario = usuarios.find(u => {
      const ced = String(u.cedula || '');
      return ced === needle || ced.toLowerCase() === String(cedulaFilter).toLowerCase();
    });

    if (!usuario) {
      console.log(`Cédula no encontrada: ${cedulaFilter}`);
      process.exit(1);
    }

    console.log(`\n--- Cédula ${fmt(usuario.cedula)} ---`);
    console.log(`Nombre: ${fmt(usuario.nombreUsuario)}`);
    process.exit(0);
  }

  const cedulaVacia = [];
  const nombreVacio = [];
  const cedulaMap = new Map();
  const reportRows = [];

  usuarios.forEach((row, index) => {
    const fila = index + 2;

    if (!row.cedula) {
      cedulaVacia.push(fila);
      addReport(reportRows, row, 'cedula_vacia', `fila=${fila}`);
    } else {
      if (!cedulaMap.has(row.cedula)) {
        cedulaMap.set(row.cedula, []);
      }
      cedulaMap.get(row.cedula).push({ row, fila });
    }

    if (!row.nombreUsuario) {
      nombreVacio.push(fila);
      addReport(reportRows, row, 'nombre_vacio', `fila=${fila}`);
    }
  });

  const duplicados = [...cedulaMap.entries()].filter(([, rows]) => rows.length > 1);
  for (const [cedula, rows] of duplicados) {
    addReport(
      reportRows,
      rows[0].row,
      'cedula_duplicada',
      `${rows.length} filas (${rows.map(r => r.fila).join(', ')})`
    );
  }

  console.log(`\n=== Validación usuarios.xlsx ===\n`);
  console.log(`Total filas: ${usuarios.length}`);
  console.log(`Cédula vacía: ${cedulaVacia.length}`);
  console.log(`Nombre vacío: ${nombreVacio.length}`);
  console.log(`Cédulas duplicadas: ${duplicados.length}`);

  if (cedulaVacia.length > 0) {
    console.log(`\n--- Primeras 20 filas sin cédula ---`);
    cedulaVacia.slice(0, 20).forEach(f => console.log(`  fila ${f}`));
    if (cedulaVacia.length > 20) {
      console.log(`  ... y ${cedulaVacia.length - 20} más`);
    }
  }

  if (nombreVacio.length > 0) {
    console.log(`\n--- Primeras 20 filas sin nombre ---`);
    nombreVacio.slice(0, 20).forEach(f => console.log(`  fila ${f}`));
    if (nombreVacio.length > 20) {
      console.log(`  ... y ${nombreVacio.length - 20} más`);
    }
  }

  if (duplicados.length > 0) {
    console.log(`\n--- Cédulas duplicadas ---`);
    duplicados.slice(0, 10).forEach(([cedula, rows]) => {
      console.log(`  ${cedula} (${rows.length} filas)`);
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
    cedulaVacia.length > 0 ||
    nombreVacio.length > 0 ||
    duplicados.length > 0;

  console.log('');
  if (hasIssues) {
    console.log('Resultado: se encontraron problemas de calidad en usuarios.xlsx.');
    process.exit(1);
  }

  console.log('Resultado: usuarios.xlsx OK.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
