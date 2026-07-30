const puppeteer = require('puppeteer');
const { renderDiagnosticoHtml } = require('../utils/renderDiagnostico');

let browserPromise = null;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

/** Carta US a 96 dpi */
const LETTER_WIDTH_PX = 816;
const LETTER_HEIGHT_PX = 1056;
const DPI = 96;

/** Márgenes visibles alineados con docs/referencia */
const PDF_MARGINS = {
  top: '0.5in',
  right: '0.55in',
  bottom: '0.35in',
  left: '0.55in',
};

function marginInchesToPx(margin) {
  const match = String(margin).match(/^([\d.]+)in$/);
  return match ? parseFloat(match[1]) * DPI : 0;
}

function getContentWidthPx() {
  const left = marginInchesToPx(PDF_MARGINS.left);
  const right = marginInchesToPx(PDF_MARGINS.right);
  return Math.round(LETTER_WIDTH_PX - left - right);
}

function getAvailableHeightPx() {
  const top = marginInchesToPx(PDF_MARGINS.top);
  const bottom = marginInchesToPx(PDF_MARGINS.bottom);
  return LETTER_HEIGHT_PX - top - bottom;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: LAUNCH_ARGS,
    }).catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

process.on('SIGTERM', () => { closeBrowser().catch(() => {}); });
process.on('SIGINT', () => { closeBrowser().catch(() => {}); });

/**
 * Genera PDF carta con texto seleccionable desde datos del formulario.
 * Escala el contenido para que quepa en una sola hoja.
 * @param {object} datos — mismos campos que recopilarValores() en el front
 * @returns {Promise<Buffer>}
 */
async function generarPdfDiagnostico(datos) {
  const html = renderDiagnosticoHtml(datos);
  const browser = await getBrowser();
  const page = await browser.newPage();

  const contentWidth = getContentWidthPx();
  const availableHeight = getAvailableHeightPx();

  try {
    await page.setViewport({
      width: contentWidth,
      height: LETTER_HEIGHT_PX,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 60000,
    });

    const contentHeight = await page.evaluate(() => document.body.scrollHeight);
    const scale = Math.min(1, availableHeight / contentHeight);

    const pdfBuffer = await page.pdf({
      format: 'letter',
      printBackground: true,
      preferCSSPageSize: false,
      margin: PDF_MARGINS,
      scale,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

module.exports = {
  generarPdfDiagnostico,
  closeBrowser,
  PDF_MARGINS,
  LETTER_WIDTH_PX,
  LETTER_HEIGHT_PX,
  getContentWidthPx,
};
