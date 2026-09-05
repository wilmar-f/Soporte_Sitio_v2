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

function throwCoded(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function throwWriteError(writeErr, message) {
  const err = new Error(message);
  err.code = 'WRITE_ERROR';
  err.cause = writeErr;
  throw err;
}

function rolExcel(rol) {
  return normalizeRol(rol) === 'administrador' ? 'Administrador' : 'Tecnico';
}

function loadSheetAoa() {
  const { workbook, sheetName, tecnicosPath } = readWorkbook();
  const sheet = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  return { workbook, sheetName, tecnicosPath, aoa };
}

function headerIndex(headerRow) {
  const idx = { cedula: -1, pass: -1, nombre: -1, cargo: -1, rol: -1 };
  (headerRow || []).forEach((h, i) => {
    if (headerMatches(h, HEADER_MAP.cedula)) idx.cedula = i;
    if (headerMatches(h, HEADER_MAP.contraseña)) idx.pass = i;
    if (headerMatches(h, HEADER_MAP.nombreCompleto)) idx.nombre = i;
    if (headerMatches(h, HEADER_MAP.cargo)) idx.cargo = i;
    if (headerMatches(h, HEADER_MAP.rol)) idx.rol = i;
  });
  return idx;
}

function ensureHeaders(aoa) {
  if (!aoa.length) {
    aoa.push(['Cédula', 'Contraseña', 'Nombre', 'Cargo', 'Rol']);
  }
  const idx = headerIndex(aoa[0]);
  if (idx.cedula < 0 || idx.pass < 0) {
    throwCoded('WRITE_ERROR', 'El Excel de técnicos no tiene columnas Cédula y Contraseña');
  }

  const addCol = (key, label) => {
    if (idx[key] >= 0) return;
    aoa[0].push(label);
    idx[key] = aoa[0].length - 1;
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      while (row.length <= idx[key]) row.push('');
      aoa[r] = row;
    }
  };

  addCol('nombre', 'Nombre');
  addCol('cargo', 'Cargo');
  addCol('rol', 'Rol');
  return idx;
}

function findRowIndex(aoa, idx, cedula) {
  for (let r = 1; r < aoa.length; r++) {
    if (normalizeCedula(aoa[r]?.[idx.cedula]) === cedula) return r;
  }
  return -1;
}

function countAdmins(aoa, idx, exceptCedula) {
  let n = 0;
  for (let r = 1; r < aoa.length; r++) {
    const ced = normalizeCedula(aoa[r]?.[idx.cedula]);
    if (!ced || (exceptCedula && ced === exceptCedula)) continue;
    if (normalizeRol(aoa[r]?.[idx.rol]) === 'administrador') n++;
  }
  return n;
}

function persistAoa(workbook, sheetName, tecnicosPath, aoa) {
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(aoa);
  writeWorkbookAtomic(workbook, tecnicosPath);
  reloadTecnicos();
}

function padRow(row, length) {
  const next = Array.isArray(row) ? [...row] : [];
  while (next.length < length) next.push('');
  return next;
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

/** Lista técnicos sin exponer contraseñas. */
function listTecnicosSeguro() {
  return getTecnicos().map(({ cedula, nombreCompleto, cargo, rol }) => ({
    cedula,
    nombreCompleto,
    cargo,
    rol,
  }));
}

/**
 * Restablece contraseña sin pedir la actual (solo administrador).
 * @throws Error con code USER_NOT_FOUND | WRITE_ERROR
 */
function adminResetContrasena(cedulaInput, contrasenaNueva) {
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

function crearTecnico({ cedula, nombreCompleto, cargo, rol, contrasena }) {
  const ced = normalizeCedula(cedula);
  const nombre = String(nombreCompleto ?? '').trim();
  const cargoVal = String(cargo ?? '').trim();
  const rolVal = normalizeRol(rol);
  const pass = String(contrasena ?? '');

  if (!ced || !nombre || !pass) {
    throwCoded('VALIDATION', 'Cédula, nombre y contraseña son requeridos');
  }

  const { workbook, sheetName, tecnicosPath, aoa } = loadSheetAoa();
  const idx = ensureHeaders(aoa);

  if (findRowIndex(aoa, idx, ced) >= 0) {
    throwCoded('DUPLICATE', 'Ya existe un usuario con esa cédula');
  }

  const row = padRow([], Math.max(aoa[0].length, idx.rol + 1));
  row[idx.cedula] = ced;
  row[idx.pass] = pass;
  row[idx.nombre] = nombre;
  row[idx.cargo] = cargoVal;
  row[idx.rol] = rolExcel(rolVal);
  aoa.push(row);

  try {
    persistAoa(workbook, sheetName, tecnicosPath, aoa);
  } catch (writeErr) {
    if (writeErr.code === 'WRITE_ERROR') throw writeErr;
    throwWriteError(writeErr, 'No se pudo guardar el usuario');
  }

  return { cedula: ced, nombreCompleto: nombre, cargo: cargoVal, rol: rolVal };
}

function actualizarTecnico(cedulaActual, { cedula, nombreCompleto, cargo, rol, contrasena }) {
  const actual = normalizeCedula(cedulaActual);
  if (!actual) throwCoded('USER_NOT_FOUND', 'Usuario no encontrado');

  const nuevaCedula = normalizeCedula(cedula);
  const nombre = String(nombreCompleto ?? '').trim();
  const cargoVal = String(cargo ?? '').trim();
  const rolVal = normalizeRol(rol);
  const pass = String(contrasena ?? '').trim();

  if (!nuevaCedula || !nombre) {
    throwCoded('VALIDATION', 'Cédula y nombre son requeridos');
  }

  const { workbook, sheetName, tecnicosPath, aoa } = loadSheetAoa();
  const idx = ensureHeaders(aoa);
  const rowIndex = findRowIndex(aoa, idx, actual);
  if (rowIndex < 0) throwCoded('USER_NOT_FOUND', 'Usuario no encontrado');

  if (nuevaCedula !== actual && findRowIndex(aoa, idx, nuevaCedula) >= 0) {
    throwCoded('DUPLICATE', 'Ya existe un usuario con esa cédula');
  }

  const eraAdmin = normalizeRol(aoa[rowIndex][idx.rol]) === 'administrador';
  if (eraAdmin && rolVal !== 'administrador' && countAdmins(aoa, idx, actual) === 0) {
    throwCoded('LAST_ADMIN', 'No se puede quitar el rol al último administrador');
  }

  const row = padRow(aoa[rowIndex], aoa[0].length);
  row[idx.cedula] = nuevaCedula;
  row[idx.nombre] = nombre;
  row[idx.cargo] = cargoVal;
  row[idx.rol] = rolExcel(rolVal);
  if (pass) row[idx.pass] = pass;
  aoa[rowIndex] = row;

  try {
    persistAoa(workbook, sheetName, tecnicosPath, aoa);
  } catch (writeErr) {
    if (writeErr.code === 'WRITE_ERROR') throw writeErr;
    throwWriteError(writeErr, 'No se pudo actualizar el usuario');
  }

  return {
    cedula: nuevaCedula,
    nombreCompleto: nombre,
    cargo: cargoVal,
    rol: rolVal,
    contrasenaActualizada: Boolean(pass),
  };
}

function eliminarTecnico(cedulaInput) {
  const ced = normalizeCedula(cedulaInput);
  if (!ced) throwCoded('USER_NOT_FOUND', 'Usuario no encontrado');

  const { workbook, sheetName, tecnicosPath, aoa } = loadSheetAoa();
  const idx = ensureHeaders(aoa);
  const rowIndex = findRowIndex(aoa, idx, ced);
  if (rowIndex < 0) throwCoded('USER_NOT_FOUND', 'Usuario no encontrado');

  if (normalizeRol(aoa[rowIndex][idx.rol]) === 'administrador' && countAdmins(aoa, idx, ced) === 0) {
    throwCoded('LAST_ADMIN', 'No se puede eliminar al último administrador');
  }

  aoa.splice(rowIndex, 1);

  try {
    persistAoa(workbook, sheetName, tecnicosPath, aoa);
  } catch (writeErr) {
    if (writeErr.code === 'WRITE_ERROR') throw writeErr;
    throwWriteError(writeErr, 'No se pudo eliminar el usuario');
  }

  return { ok: true };
}

module.exports = {
  getTecnicos,
  reloadTecnicos,
  findTecnicoByCedula,
  updateContrasena,
  listTecnicosSeguro,
  adminResetContrasena,
  crearTecnico,
  actualizarTecnico,
  eliminarTecnico,
  normalizeCedula,
  normalizeRol,
  getTecnicosPath,
};
