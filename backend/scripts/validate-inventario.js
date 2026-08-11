/**
 * Audita la calidad de inventario.xlsx (misma lógica que la app).
 * Uso:
 *   node backend/scripts/validate-inventario.js
 *   node backend/scripts/validate-inventario.js --serial 8CC3151BHH
 */
const { reloadInventario } = require('../utils/readInventario');

const args = process.argv.slice(2);
const serialIdx = args.indexOf('--serial');
const serialFilter = serialIdx !== -1 ? args[serialIdx + 1]?.trim() : null;

if (serialIdx !== -1 && !serialFilter) {
  console.error('Uso: node scripts/validate-inventario.js [--serial SERIAL]');
  process.exit(1);
}

function fmt(value) {
  const s = String(value ?? '').trim();
  return s || '(vacío)';
}

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

  for (const row of inventario) {
    const { serial, etiqueta, fabricante, modelo } = row;

    if (!serialMap.has(serial)) {
      serialMap.set(serial, []);
    }
    serialMap.get(serial).push(row);

    if (!etiqueta) sinEtiqueta.push(serial);
    else if (etiqueta.length !== 7) etiquetaLongitud.push({ serial, etiqueta, len: etiqueta.length });

    if (!fabricante) sinFabricante.push(serial);
    if (!modelo) sinModelo.push(serial);
  }

  const duplicados = [...serialMap.entries()].filter(([, rows]) => rows.length > 1);

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
