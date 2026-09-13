const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const templatePath = path.join(__dirname, '../templates/acta.template.hbs');
const logoPath = path.join(__dirname, '../../front/assets/pdf-acta/logo acta.jpg');

let compiledTemplate = null;

const NOVEDAD_MAIN = [
  { value: 'CALIDAD PRESTAMO', lineas: ['CALIDAD', 'PRESTAMO'] },
  { value: 'INGRESO DE ALTA', lineas: ['INGRESO', 'DE ALTA'] },
  { value: 'TRASLADO REUBICACIÓN', lineas: ['TRASLADO', 'REUBICACIÓN'] },
  { value: 'MODIFICACIÓN ADICIÓN', lineas: ['MODIFICACIÓN', 'ADICIÓN'] },
  { value: 'RETIRO DE BAJA', lineas: ['RETIRO', 'DE BAJA'] },
];

const NOVEDAD_BAJO_NO = [{ value: 'VENTA' }, { value: 'HURTO' }];
const NOVEDAD_BAJO_ACTA = [{ value: 'DESTRUCCIÓN' }, { value: 'SINIESTRO' }];

function toDataUrl(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function getCompiledTemplate() {
  if (!compiledTemplate) {
    compiledTemplate = Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
  }
  return compiledTemplate;
}

function mayus(val) {
  return String(val ?? '').trim().toUpperCase();
}

function norm(val) {
  return mayus(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function fechaPdf(iso) {
  const s = String(iso || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return mayus(s);
}

function persona(p = {}) {
  return {
    nombre: mayus(p.nombre),
    cedula: mayus(p.cedula),
    cargo: mayus(p.cargo),
    departamento: mayus(p.departamento),
    unidadNegocio: mayus(p.unidadNegocio),
    ubicacion: mayus(p.ubicacion),
  };
}

function filaActivo(a = {}) {
  return {
    tipo: mayus(a.tipo),
    marca: mayus(a.marca),
    modelo: mayus(a.modelo),
    serie: mayus(a.serie),
    etiqueta: mayus(a.etiqueta),
    otros: mayus(a.otros),
    software: mayus(a.software),
  };
}

function itemsNovedad(lista, sel) {
  return lista.map((it) => ({
    label: mayus(it.value),
    selected: norm(it.value) === sel,
  }));
}

function buildNovedad(seleccion) {
  const sel = norm(seleccion);
  return {
    main: NOVEDAD_MAIN.map((col) => ({
      selected: norm(col.value) === sel,
      lineas: col.lineas.map((linea) => mayus(linea)),
    })),
    bajoNo: itemsNovedad(NOVEDAD_BAJO_NO, sel),
    bajoActa: itemsNovedad(NOVEDAD_BAJO_ACTA, sel),
  };
}

function renderActaHtml(datos) {
  const compile = getCompiledTemplate();
  const firmaEntrega = String(datos.firmaEntrega || '').startsWith('data:') ? datos.firmaEntrega : '';
  const firmaRecibe = String(datos.firmaRecibe || '').startsWith('data:') ? datos.firmaRecibe : '';
  return compile({
    logoSrc: toDataUrl(logoPath),
    fechaNovedad: fechaPdf(datos.fechaNovedad),
    numeroActa: mayus(datos.numeroActa),
    novedad: buildNovedad(datos.tipoNovedad),
    entregado: persona(datos.entregado),
    recibido: persona(datos.recibido),
    ubicacionContable: mayus(datos.ubicacionContable),
    usuarioRed: mayus(datos.usuarioRed),
    filas: Array.isArray(datos.filas) ? datos.filas.map(filaActivo) : [],
    configHardware: mayus(datos.configHardware),
    modificaciones: mayus(datos.modificaciones),
    observaciones: mayus(datos.observaciones),
    firmaEntrega,
    firmaRecibe,
    pagina: datos.pagina || 1,
    totalPaginas: datos.totalPaginas || 1,
  });
}

module.exports = { renderActaHtml, filaActivo };
