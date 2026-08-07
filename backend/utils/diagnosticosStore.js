const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDataDir } = require('./dataPaths');

function getStorePath() {
  return path.join(getDataDir(), 'diagnosticos.json');
}

function ensureStore() {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, '[]', 'utf8');
  }
}

function readAll() {
  ensureStore();
  const storePath = getStorePath();
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  ensureStore();
  const storePath = getStorePath();
  fs.writeFileSync(storePath, JSON.stringify(records, null, 2), 'utf8');
}

function extractAnio(fecha) {
  const match = String(fecha ?? '').match(/^(\d{4})/);
  if (match) return parseInt(match[1], 10);
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

function appendDiagnostico(record) {
  const records = readAll();
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fecha: String(record.fecha ?? '').trim(),
    nombreTecnico: String(record.nombreTecnico ?? '').trim(),
    cedulaTecnico: String(record.cedulaTecnico ?? '').trim(),
    tipoDiagnostico: String(record.tipoDiagnostico ?? '').trim().toUpperCase(),
    serial: String(record.serial ?? '').trim(),
    etiqueta: String(record.etiqueta ?? '').trim(),
  };
  records.push(entry);
  writeAll(records);
  return entry;
}

function listDiagnosticos({ q = '', anio = '', tipo = '', page = 1, limit = 20 } = {}) {
  let items = readAll();

  const query = String(q).trim().toLowerCase();
  if (query) {
    items = items.filter(row =>
      String(row.serial ?? '').toLowerCase().includes(query) ||
      String(row.etiqueta ?? '').toLowerCase().includes(query)
    );
  }

  if (anio) {
    const year = parseInt(String(anio), 10);
    if (!Number.isNaN(year)) {
      items = items.filter(row => extractAnio(row.fecha) === year);
    }
  }

  if (tipo) {
    const tipoNorm = String(tipo).trim().toUpperCase();
    items = items.filter(row => String(row.tipoDiagnostico ?? '').toUpperCase() === tipoNorm);
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = items.length;
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(pageNum, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

function getAniosDisponibles() {
  const years = new Set();
  for (const row of readAll()) {
    const y = extractAnio(row.fecha);
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

module.exports = {
  appendDiagnostico,
  listDiagnosticos,
  getAniosDisponibles,
};
