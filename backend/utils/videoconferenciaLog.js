const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDataDir } = require('./dataPaths');

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

module.exports = { readAll, appendFoto, ensureLog };
