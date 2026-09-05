const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDataDir } = require('./dataPaths');
const {
  inRango,
  matchesSede,
  matchesTecnico,
  countBy,
  topLabel,
  paginate,
  collectTecnicos,
} = require('./dashboardStats');

function getLogPath() {
  return path.join(getDataDir(), 'videoconferencia-log.json');
}

function ensureLog() {
  const filePath = getLogPath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
}

function readAll() {
  ensureLog();
  try {
    const data = JSON.parse(fs.readFileSync(getLogPath(), 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  ensureLog();
  fs.writeFileSync(getLogPath(), JSON.stringify(records, null, 2), 'utf8');
}

function appendFoto(record) {
  const records = readAll();
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sede: String(record.sede ?? '').trim(),
    sala: String(record.sala ?? '').trim(),
    filename: String(record.filename ?? '').trim(),
    reemplazo: Boolean(record.reemplazo),
    cedulaTecnico: String(record.cedulaTecnico ?? '').trim(),
    nombreTecnico: String(record.nombreTecnico ?? '').trim(),
  };
  records.push(entry);
  writeAll(records);
  return entry;
}

function listFotos({ desde = '', hasta = '', sede = '', tecnico = '', page = 1, limit = 10 } = {}) {
  const all = readAll();
  const items = all
    .filter(row =>
      inRango(row.createdAt, desde, hasta) &&
      matchesSede(row, sede) &&
      matchesTecnico(row, tecnico)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const porSede = countBy(items, r => r.sede);
  const porSala = countBy(items, r => `${r.sede} / ${r.sala}`);
  const porTecnico = countBy(items, r => r.nombreTecnico || r.cedulaTecnico);

  return {
    ...paginate(items, page, limit),
    filtros: {
      sedes: [...new Set(all.map(r => r.sede).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'es')),
      tecnicos: collectTecnicos(all),
    },
    agregados: {
      kpis: {
        total: items.length,
        sedeTop: topLabel(porSede),
        tecnicoTop: topLabel(porTecnico),
      },
      porSede,
      porSala,
      porTecnico,
    },
  };
}

module.exports = { readAll, appendFoto, ensureLog, listFotos };
