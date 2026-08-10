const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getDataDir } = require('./dataPaths');

let cache = null;

const HEADER_MAP = {
  serial: ['nº serie', 'n° serie', 'no serie', 'numero serie', 'número serie', 'serial', 'n serie'],
  etiqueta: ['etiqueta'],
  fabricante: ['fabricante', 'marca'],
  modelo: ['modelo'],
};

function getInventarioPath() {
  return path.join(getDataDir(), 'inventario.xlsx');
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeSerial(value) {
  const s = String(value ?? '').trim();
  return s.length > 64 ? s.slice(0, 64) : s;
}

function clipField(value, max) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function mapRow(rawRow) {
  const normalized = {};
  for (const [key, val] of Object.entries(rawRow)) {
    normalized[normalizeHeader(key)] = val;
  }

  const pick = (aliases) => {
    for (const alias of aliases) {
      const val = normalized[normalizeHeader(alias)];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  };

  const serial = normalizeSerial(pick(HEADER_MAP.serial));
  if (!serial) return { serial: '', etiqueta: '', fabricante: '', modelo: '' };

  return {
    serial,
    etiqueta: clipField(pick(HEADER_MAP.etiqueta), 32),
    fabricante: clipField(pick(HEADER_MAP.fabricante), 64),
    modelo: clipField(pick(HEADER_MAP.modelo), 128),
  };
}

function readWorkbook() {
  const inventarioPath = getInventarioPath();
  if (!fs.existsSync(inventarioPath)) {
    throw new Error(`No se encontró el archivo de inventario: ${inventarioPath}`);
  }

  const workbook = XLSX.readFile(inventarioPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return { workbook, sheetName, rows, inventarioPath };
}

function loadInventario() {
  const { rows } = readWorkbook();
  return rows
    .map(mapRow)
    .filter(row => row.serial);
}

function getInventario() {
  if (!cache) {
    cache = loadInventario();
  }
  return cache;
}

function reloadInventario() {
  cache = loadInventario();
  return cache;
}

module.exports = {
  getInventario,
  reloadInventario,
  getInventarioPath,
  normalizeSerial,
};
