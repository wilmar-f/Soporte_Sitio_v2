/**
 * Autorización única de OneDrive personal (cuenta Microsoft).
 * Uso (desde backend/):
 *   node scripts/onedrive-auth.js
 *
 * Requiere ONEDRIVE_CLIENT_ID en .env (y ONEDRIVE_CLIENT_SECRET si la app es confidencial).
 * Abre el navegador, autorizas, y el script imprime ONEDRIVE_REFRESH_TOKEN.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET || '';
const TENANT = process.env.ONEDRIVE_TENANT || 'consumers';
const PORT = Number(process.env.ONEDRIVE_OAUTH_PORT || 3456);
const REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI || `http://localhost:${PORT}/callback`;
const SCOPE = 'offline_access Files.ReadWrite';

if (!CLIENT_ID) {
  console.error('Define ONEDRIVE_CLIENT_ID en el .env de la raíz del proyecto.');
  process.exit(1);
}

const authorizeUrl = new URL(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`);
authorizeUrl.searchParams.set('client_id', CLIENT_ID);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeUrl.searchParams.set('response_mode', 'query');
authorizeUrl.searchParams.set('scope', SCOPE);

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  if (reqUrl.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = reqUrl.searchParams.get('code');
  const error = reqUrl.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Error de autorización: ${error || 'sin código'}`);
    server.close();
    process.exit(1);
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
  });
  if (CLIENT_SECRET) params.set('client_secret', CLIENT_SECRET);

  const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await tokenRes.json();

  if (!tokenRes.ok || !data.refresh_token) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No se obtuvo refresh token. Revisa Client Secret y Redirect URI.\n' + JSON.stringify(data, null, 2));
    server.close();
    process.exit(1);
  }

  console.log('\nAgrega esto a tu .env (y a Render):\n');
  console.log(`ONEDRIVE_REFRESH_TOKEN=${data.refresh_token}\n`);

  const envPath = path.join(__dirname, '../../.env');
  let envText = fs.readFileSync(envPath, 'utf8');
  if (/^ONEDRIVE_REFRESH_TOKEN=/m.test(envText)) {
    envText = envText.replace(/^ONEDRIVE_REFRESH_TOKEN=.*$/m, `ONEDRIVE_REFRESH_TOKEN=${data.refresh_token}`);
  } else {
    envText += `\nONEDRIVE_REFRESH_TOKEN=${data.refresh_token}\n`;
  }
  fs.writeFileSync(envPath, envText, 'utf8');
  console.log(`Refresh token guardado en ${envPath}`);

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<p>Autorización correcta. Copia el refresh token de la consola y cierra esta ventana.</p>');
  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log('Abre esta URL en el navegador (cuenta Microsoft personal):\n');
  console.log(authorizeUrl.toString());
  console.log(`\nRedirect URI que debes registrar en Azure: ${REDIRECT_URI}`);
});
