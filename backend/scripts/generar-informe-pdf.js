/**
 * Genera PDF del informe técnico desde docs/informe-tecnico.html
 * Uso: node backend/scripts/generar-informe-pdf.js
 *      npm run generate:informe
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../../docs/informe-tecnico.html');
const outPath = path.join(__dirname, '../../docs/Informe_Tecnico_Diagnostico03.pdf');

const LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

async function launchBrowser() {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

  if (isProd) {
    const puppeteer = require('puppeteer-core');
    const chromium = require('@sparticuz/chromium');
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: [...chromium.args, ...LAUNCH_ARGS],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  const puppeteer = require('puppeteer');
  return puppeteer.launch({ headless: true, args: LAUNCH_ARGS });
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error(`No se encontró: ${htmlPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

    await page.pdf({
      path: outPath,
      format: 'letter',
      printBackground: true,
      margin: { top: '0.6in', right: '0.55in', bottom: '0.6in', left: '0.55in' },
    });

    const stats = fs.statSync(outPath);
    console.log(`PDF generado: ${outPath}`);
    console.log(`Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error generando PDF:', err.message);
  process.exit(1);
});
