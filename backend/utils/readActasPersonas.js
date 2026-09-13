const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getDataDir } = require('./dataPaths');

const HEADER_MAP = {
  cedula: ['cedula', 'cédula', 'documento', 'identificacion', 'identificación'],
  nombres: ['nombres', 'nombre', 'nombre completo', 'nombrecompleto'],
  cargo: ['cargo'],
  departamento: ['departamento'],
  unidadNegocio: ['unidad de negocio', 'unidadnegocio', 'un'],
  ubicacion: ['ubicacion', 'ubicación', 'ubicacion fisica', 'ubicación física'],
};

let cache = null;

function getActasPersonasPath() {
  return path.join(getDataDir(), 'Actas.xlsx');
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCedula(value) {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  return digits || raw;
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

  return {
    cedula: normalizeCedula(pick(normalized, HEADER_MAP.cedula)),
    nombres: pick(normalized, HEADER_MAP.nombres),
    cargo: pick(normalized, HEADER_MAP.cargo),
    departamento: pick(normalized, HEADER_MAP.departamento),
    unidadNegocio: pick(normalized, HEADER_MAP.unidadNegocio),
    ubicacion: pick(normalized, HEADER_MAP.ubicacion),
  };
}

function loadActasPersonas() {
  const filePath = getActasPersonasPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo de personas de actas: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows.map(mapRow).filter((row) => row.cedula);
}

function getActasPersonas() {
  if (!cache) {
    cache = loadActasPersonas();
  }
  return cache;
}

function reloadActasPersonas() {
  cache = loadActasPersonas();
  return cache;
}

function findPersonaPorCedula(cedula) {
  const key = normalizeCedula(cedula);
  if (!key) return null;
  return getActasPersonas().find((row) => normalizeCedula(row.cedula) === key) || null;
}

module.exports = {
  getActasPersonas,
  reloadActasPersonas,
  findPersonaPorCedula,
  getActasPersonasPath,
  normalizeCedula,
};
