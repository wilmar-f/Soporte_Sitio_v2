const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getDataDir } = require('./dataPaths');

const HEADER_MAP = {
  cedula: ['cedula', 'cédula', 'documento', 'identificacion', 'identificación'],
  nombreUsuario: [
    'nombre usuario',
    'nombreusuario',
    'nombre',
    'nombre completo',
    'nombrecompleto',
  ],
};

function getUsuariosPath() {
  return path.join(getDataDir(), 'usuarios.xlsx');
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function pick(normalized, aliases) {
  for (const alias of aliases) {
    const val = normalized[normalizeHeader(alias)];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function mapRow(rawRow) {
  const normalized = {};
  for (const [key, val] of Object.entries(rawRow)) {
    normalized[normalizeHeader(key)] = val;
  }

  const cedula = pick(normalized, HEADER_MAP.cedula).replace(/\D/g, '') || pick(normalized, HEADER_MAP.cedula);
  const nombreUsuario = pick(normalized, HEADER_MAP.nombreUsuario);
  return { cedula, nombreUsuario };
}

function loadUsuariosRows() {
  const filePath = getUsuariosPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo de usuarios: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows.map(mapRow);
}

function reloadUsuarios() {
  return loadUsuariosRows().filter(row => row.cedula);
}

module.exports = {
  loadUsuariosRows,
  reloadUsuarios,
  getUsuariosPath,
};
