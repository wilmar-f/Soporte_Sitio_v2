const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getDataDir } = require('./dataPaths');

let cache = null;

const HEADER_MAP = {
  cedula: ['cedula', 'cédula', 'cedula tecnico', 'cédula técnico', 'documento'],
  contraseña: ['contraseña', 'contrasena', 'password', 'clave'],
  nombreCompleto: ['nombre', 'nombre completo', 'nombrecompleto', 'nombre tecnico', 'nombre técnico'],
  cargo: ['cargo', 'puesto'],
  rol: ['rol'],
};

function getTecnicosPath() {
  return path.join(getDataDir(), 'tecnicos.xlsx');
}

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

function getColumnKeyFromRow(row, headerAliases) {
  for (const key of Object.keys(row)) {
    const norm = normalizeHeader(key);
    for (const alias of headerAliases) {
      if (norm === normalizeHeader(alias)) return key;
    }
  }
  return null;
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

function readWorkbook() {
  const tecnicosPath = getTecnicosPath();
  if (!fs.existsSync(tecnicosPath)) {
    throw new Error(`No se encontró el archivo de técnicos: ${tecnicosPath}`);
  }

  const workbook = XLSX.readFile(tecnicosPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return { workbook, sheetName, rows, tecnicosPath };
}

function headerMatches(cellValue, aliases) {
  const norm = normalizeHeader(cellValue);
  return aliases.some(alias => normalizeHeader(alias) === norm);
}

function findHeaderColumns(sheet) {
  const ref = sheet['!ref'];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);
  let cedulaCol = null;
  let passCol = null;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    const header = cell?.v;
    if (headerMatches(header, HEADER_MAP.cedula)) cedulaCol = c;
    if (headerMatches(header, HEADER_MAP.contraseña)) passCol = c;
  }

  if (cedulaCol == null || passCol == null) return null;
  return { range, cedulaCol, passCol };
}

function writeWorkbookAtomic(workbook, filePath) {
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, buf);
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') {
      fs.copyFileSync(tmpPath, filePath);
      fs.unlinkSync(tmpPath);
    } else {
      try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
      throw err;
    }
  }
}

function loadTecnicos() {
  const { rows } = readWorkbook();
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

/**
 * Actualiza la contraseña de un técnico en tecnicos.xlsx.
 * @returns {{ ok: true }} si se actualizó correctamente
 * @throws Error con code INVALID_PASSWORD | USER_NOT_FOUND | WRITE_ERROR
 */
function updateContrasena(cedulaInput, contrasenaActual, contrasenaNueva) {
  const cedula = normalizeCedula(cedulaInput);
  if (!cedula) {
    const err = new Error('Usuario no encontrado');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const { workbook, sheetName, tecnicosPath } = readWorkbook();
  const sheet = workbook.Sheets[sheetName];
  const cols = findHeaderColumns(sheet);

  if (!cols) {
    const err = new Error('Usuario no encontrado');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const { range, cedulaCol, passCol } = cols;
  let found = false;

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const cedulaCellRef = XLSX.utils.encode_cell({ r, c: cedulaCol });
    const cedulaCell = sheet[cedulaCellRef];
    if (normalizeCedula(cedulaCell?.v) !== cedula) continue;

    const passCellRef = XLSX.utils.encode_cell({ r, c: passCol });
    const passCell = sheet[passCellRef];
    if (String(passCell?.v ?? '') !== String(contrasenaActual)) {
      const err = new Error('Contraseña actual incorrecta');
      err.code = 'INVALID_PASSWORD';
      throw err;
    }

    sheet[passCellRef] = { t: 's', v: contrasenaNueva };
    found = true;
    break;
  }

  if (!found) {
    const err = new Error('Usuario no encontrado');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  try {
    writeWorkbookAtomic(workbook, tecnicosPath);
    reloadTecnicos();
  } catch (writeErr) {
    const err = new Error('No se pudo guardar la nueva contraseña');
    err.code = 'WRITE_ERROR';
    err.cause = writeErr;
    throw err;
  }

  return { ok: true };
}

module.exports = {
  getTecnicos,
  reloadTecnicos,
  findTecnicoByCedula,
  updateContrasena,
  normalizeCedula,
  normalizeRol,
  getTecnicosPath,
};
