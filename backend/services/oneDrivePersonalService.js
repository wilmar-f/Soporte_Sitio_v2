const DEFAULT_FOLDER_URL =
  'https://1drv.ms/f/c/0c59cf37384aef0f/IgCrWSFPPk0KSLAcyUD2L1hgAQD6nlNra4hyhQReqBSU9gI?e=LvBAzi';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const GRAPH = 'https://graph.microsoft.com/v1.0';

let tokenCache = { accessToken: null, expiresAt: 0 };
let rootCache = null;

class FotoYaExisteError extends Error {
  constructor(filename) {
    super(`Ya existe una foto de hoy: ${filename}`);
    this.name = 'FotoYaExisteError';
    this.filename = filename;
  }
}

function isConfigured() {
  return Boolean(process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_REFRESH_TOKEN);
}

function encodeShareId(url) {
  const b64 = Buffer.from(url, 'utf8').toString('base64');
  return 'u!' + b64.replace(/=+$/g, '').replace(/\//g, '_').replace(/\+/g, '-');
}

function folderNameMes(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${mm} ${MESES[date.getMonth()]}`;
}

function fechaBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type).value;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  return {
    year,
    month,
    day,
    iso: `${get('year')}-${get('month')}-${get('day')}`,
    mesFolder: `${String(month).padStart(2, '0')} ${MESES[month - 1]}`,
  };
}

function sanitizeFolderName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function graphFetch(pathname, { method = 'GET', token, headers = {}, body } = {}) {
  const res = await fetch(`${GRAPH}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });
  return res;
}

async function graphJson(pathname, options = {}) {
  const res = await graphFetch(pathname, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error?.message || `Graph ${res.status}`);
    err.status = res.status;
    err.graph = data;
    throw err;
  }
  return data;
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
  if (!clientId || !refreshToken) {
    const err = new Error('OneDrive no está configurado (faltan ONEDRIVE_CLIENT_ID u ONEDRIVE_REFRESH_TOKEN)');
    err.status = 503;
    throw err;
  }

  const tenant = process.env.ONEDRIVE_TENANT || 'consumers';
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'offline_access Files.ReadWrite',
  });
  if (clientSecret) params.set('client_secret', clientSecret);

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error_description || 'No se pudo renovar el token de OneDrive');
    err.status = 503;
    throw err;
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in) || 3600) * 1000,
  };
  return tokenCache.accessToken;
}

async function resolveRoot(token) {
  if (rootCache) return rootCache;

  const shareUrl = process.env.ONEDRIVE_FOLDER_URL || DEFAULT_FOLDER_URL;
  const shareId = encodeShareId(shareUrl);
  try {
    const item = await graphJson(`/shares/${shareId}/driveItem`, { token });
    rootCache = { driveId: item.parentReference.driveId, itemId: item.id };
    return rootCache;
  } catch (first) {
    const res = await fetch(shareUrl, { redirect: 'follow', method: 'GET' });
    const finalUrl = res.url || shareUrl;
    if (finalUrl !== shareUrl) {
      const item = await graphJson(`/shares/${encodeShareId(finalUrl)}/driveItem`, { token });
      rootCache = { driveId: item.parentReference.driveId, itemId: item.id };
      return rootCache;
    }
    throw first;
  }
}

async function findChild(token, driveId, parentId, name) {
  const encoded = encodeURIComponent(name);
  const res = await graphFetch(`/drives/${driveId}/items/${parentId}:/${encoded}`, { token });
  if (res.ok) return res.json();
  if (res.status === 404) return null;

  const children = await graphJson(
    `/drives/${driveId}/items/${parentId}/children?$select=id,name,folder`,
    { token }
  );
  const wanted = name.toLowerCase();
  return (children.value || []).find(c => String(c.name).toLowerCase() === wanted) || null;
}

async function ensureFolder(token, driveId, parentId, name) {
  const existing = await findChild(token, driveId, parentId, name);
  if (existing) return existing;

  try {
    return await graphJson(`/drives/${driveId}/items/${parentId}/children`, {
      token,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    });
  } catch (err) {
    const retry = await findChild(token, driveId, parentId, name);
    if (retry) return retry;
    throw err;
  }
}

async function fileExists(token, driveId, parentId, filename) {
  const item = await findChild(token, driveId, parentId, filename);
  return Boolean(item && !item.folder);
}

async function uploadBuffer(token, driveId, parentId, filename, buffer, contentType) {
  const encoded = encodeURIComponent(filename);
  const res = await graphFetch(
    `/drives/${driveId}/items/${parentId}:/${encoded}:/content`,
    {
      token,
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'image/jpeg' },
      body: buffer,
    }
  );
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error?.message || `No se pudo subir el archivo (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function guardarFotoVideoconferencia({ sede, sala, buffer, reemplazar }) {
  const sedeFolder = sanitizeFolderName(sede);
  const salaFolder = sanitizeFolderName(sala);
  if (!sedeFolder || !salaFolder) {
    const err = new Error('Sede y sala son obligatorias');
    err.status = 400;
    throw err;
  }

  const fecha = fechaBogota();
  const filename = `${fecha.iso}-${sedeFolder}.jpg`;
  const token = await getAccessToken();
  const root = await resolveRoot(token);

  const sedeItem = await ensureFolder(token, root.driveId, root.itemId, sedeFolder);
  const yearItem = await ensureFolder(token, root.driveId, sedeItem.id, String(fecha.year));
  const monthItem = await ensureFolder(token, root.driveId, yearItem.id, fecha.mesFolder);
  const salaItem = await ensureFolder(token, root.driveId, monthItem.id, salaFolder);

  const exists = await fileExists(token, root.driveId, salaItem.id, filename);
  if (exists && !reemplazar) {
    throw new FotoYaExisteError(filename);
  }

  const uploaded = await uploadBuffer(token, root.driveId, salaItem.id, filename, buffer, 'image/jpeg');
  return {
    filename,
    ruta: `${sedeFolder}/${fecha.year}/${fecha.mesFolder}/${salaFolder}/${filename}`,
    id: uploaded.id,
    webUrl: uploaded.webUrl || null,
  };
}

module.exports = {
  isConfigured,
  fechaBogota,
  folderNameMes,
  guardarFotoVideoconferencia,
  FotoYaExisteError,
};
