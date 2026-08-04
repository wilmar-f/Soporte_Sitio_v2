const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const templatePath = path.join(__dirname, '../templates/evidencias.template.hbs');
const logo1Path = path.join(__dirname, '../../front/assets/logo1.png');

let compiledTemplate = null;

function toDataUrl(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function getCompiledTemplate() {
  if (!compiledTemplate) {
    const source = fs.readFileSync(templatePath, 'utf8');
    compiledTemplate = Handlebars.compile(source);
  }
  return compiledTemplate;
}

function renderEvidenciasHtml(imagenesBase64 = []) {
  const imgs = (imagenesBase64 || [])
    .filter(src => typeof src === 'string' && src.startsWith('data:'))
    .slice(0, 4)
    .map(src => new Handlebars.SafeString(
      `<div class="evidencia-item"><img src="${src}" alt="Evidencia"></div>`
    ));

  const compile = getCompiledTemplate();
  return compile({
    logo1Src: toDataUrl(logo1Path),
    imagenes: imgs,
  });
}

module.exports = { renderEvidenciasHtml };
