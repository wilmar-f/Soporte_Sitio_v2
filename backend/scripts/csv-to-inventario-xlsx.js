/**
 * Convierte inventario.csv (punto y coma) a inventario.xlsx.
 * Usa lectura línea a línea (más robusta que csv-parser ante comillas en modelos).
 * Uso: node backend/scripts/csv-to-inventario-xlsx.js [ruta_origen.csv]
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const origen = process.argv[2] || path.join(__dirname, '../data/inventario.csv');
const destino = path.join(__dirname, '../data/inventario.xlsx');

const MAX_LEN = { serial: 64, etiqueta: 32, fabricante: 64, modelo: 128 };

function clip(value, max) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function parseLine(line) {
  const parts = line.split(';');
  if (parts.length < 2) return null;

  const serialRaw = parts[0].trim();
  if (!serialRaw || serialRaw.length > MAX_LEN.serial) return null;

  return {
    'Nº serie': serialRaw,
    Etiqueta: clip(parts[1], MAX_LEN.etiqueta),
    Fabricante: clip(parts[2] || '', MAX_LEN.fabricante),
    Modelo: clip(parts.slice(3).join(';'), MAX_LEN.modelo),
  };
}

const content = fs.readFileSync(origen, 'utf8').replace(/^\uFEFF/, '');
const lines = content.split(/\r?\n/);
const filas = [];
let omitidas = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const row = parseLine(line);
  if (!row) {
    omitidas++;
    continue;
  }
  filas.push(row);
}

const sheet = XLSX.utils.json_to_sheet(filas);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, 'Inventario');
XLSX.writeFile(workbook, destino);
console.log(`Convertidas ${filas.length} filas → ${destino}${omitidas ? ` (${omitidas} omitidas por datos inválidos)` : ''}`);
