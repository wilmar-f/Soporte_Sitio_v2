const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const tecnicosPath = path.join(__dirname, '../data/tecnicos.xlsx');

let cache = null;

const HEADER_MAP = {
  cedula: ['cedula', 'cédula', 'cedula tecnico', 'cédula técnico', 'documento'],
  contraseña: ['contraseña', 'contrasena', 'password', 'clave'],
  nombreCompleto: ['nombre', 'nombre completo', 'nombrecompleto', 'nombre tecnico', 'nombre técnico'],
  cargo: ['cargo', 'puesto'],
  rol: ['rol'],
};

/** Normaliza valor de Rol del Excel → tecnico | administrador */
function normalizeRol(value) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!raw) return 'tecnico';
  if (raw === 'administrador' || raw === 'admin') return 'administrador';
  return 'tecnico';
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCedula(value) {
  return String(value ?? '').replace(/\D/g, '');
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

  const cedulaRaw = pick(HEADER_MAP.cedula);
  const cedula = normalizeCedula(cedulaRaw);

  return {
    cedula,
    contraseña: pick(HEADER_MAP.contraseña),
    nombreCompleto: pick(HEADER_MAP.nombreCompleto),
    cargo: pick(HEADER_MAP.cargo),
    rol: normalizeRol(pick(HEADER_MAP.rol)),
  };
}

function loadTecnicos() {
  if (!fs.existsSync(tecnicosPath)) {
    throw new Error(`No se encontró el archivo de técnicos: ${tecnicosPath}`);
  }

  const workbook = XLSX.readFile(tecnicosPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .map(mapRow)
    .filter(row => row.cedula && row.contraseña);
}

function getTecnicos() {
  if (!cache) {
    cache = loadTecnicos();
  }
  return cache;
}

function reloadTecnicos() {
  cache = loadTecnicos();
  return cache;
}

function findTecnicoByCedula(cedulaInput, contrasena) {
  const cedula = normalizeCedula(cedulaInput);
  if (!cedula || !contrasena) return null;

  const tecnicos = getTecnicos();
  return tecnicos.find(
    t => t.cedula === cedula && t.contraseña === String(contrasena)
  ) || null;
}

module.exports = {
  getTecnicos,
  reloadTecnicos,
  findTecnicoByCedula,
  normalizeCedula,
  normalizeRol,
};
