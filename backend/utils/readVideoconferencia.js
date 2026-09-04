const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getDataDir } = require('./dataPaths');

let cache = null;

function getExcelPath() {
  return path.join(getDataDir(), 'videoconferencia.xlsx');
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function loadSalas() {
  const filePath = getExcelPath();
  if (!fs.existsSync(filePath)) {
    throw new Error('No se encontró videoconferencia.xlsx');
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const grouped = new Map();

  for (const raw of rows) {
    const mapped = {};
    for (const [key, val] of Object.entries(raw)) {
      mapped[normalizeHeader(key)] = String(val ?? '').trim();
    }

    const sede = mapped.sede || '';
    const sala = mapped['sala de videoconferencia'] || mapped.sala || '';
    if (!sede || !sala) continue;

    if (!grouped.has(sede)) grouped.set(sede, []);
    const list = grouped.get(sede);
    if (!list.includes(sala)) list.push(sala);
  }

  return [...grouped.entries()].map(([sede, salas]) => ({ sede, salas }));
}

function getCatalogo() {
  if (!cache) cache = loadSalas();
  return cache;
}

function existeSedeSala(sede, sala) {
  const item = getCatalogo().find(s => s.sede === sede);
  return Boolean(item && item.salas.includes(sala));
}

module.exports = { getCatalogo, existeSedeSala };
