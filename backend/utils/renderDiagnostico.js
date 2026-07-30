const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const templatePath = path.join(__dirname, '../templates/diagnostico.template.hbs');
const logo1Path = path.join(__dirname, '../../front/assets/logo1.png');
const logo2Path = path.join(__dirname, '../../front/assets/logo2.png');

let compiledTemplate = null;

function toDataUrl(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function getCompiledTemplate() {
  if (!compiledTemplate) {
    const source = fs.readFileSync(templatePath, 'utf8');
    compiledTemplate = Handlebars.compile(source);
  }
  return compiledTemplate;
}

/** Campos esperados del formulario de diagnóstico */
const CAMPOS_TEXTO = [
  'sede', 'fecha', 'nombreUsuario', 'areaUsuario', 'cedula', 'ubicacionFisica',
  'marca', 'serial', 'modelo', 'etiqueta', 'procesador', 'versionSO', 'ram',
  'nombreEquipo', 'sistemaOperativo', 'versionOffice', 'hd', 'appsMayorUso',
  'appsFueraEstandar', 'descripcionFalla', 'accionesRealizadas', 'diagnosticoFinal',
  'nombreTecnico', 'cedulaTecnico', 'cargoTecnico',
  'testFabricanteRealizado', 'testFabricanteVersion', 'testFabricanteResultado',
  'intercambioPartes', 'razonSolicitud',
];

function formatFechaPdf(val) {
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(val ?? '');
}

function prepareView(raw = {}) {
  const view = {};
  for (const key of CAMPOS_TEXTO) {
    view[key] = String(raw[key] ?? '');
  }
  view.fecha = formatFechaPdf(raw.fecha);

  const firma = raw.firmaBase64 && String(raw.firmaBase64).startsWith('data:')
    ? String(raw.firmaBase64)
    : '';
  view.firmaImg = firma
    ? new Handlebars.SafeString(`<img src="${firma}" alt="Firma">`)
    : new Handlebars.SafeString('');

  view.logo1Src = toDataUrl(logo1Path);
  view.logo2Src = toDataUrl(logo2Path);

  return view;
}

function renderDiagnosticoHtml(datos) {
  const compile = getCompiledTemplate();
  return compile(prepareView(datos));
}

module.exports = { renderDiagnosticoHtml, CAMPOS_TEXTO };
