const CLAVES = ['token', 'usuario', 'loginType', 'o365session'];
const LOGIN = '/pages/index.html';
const CANAL = 'diagnostico-sesion';
const IDLE_MS = 10 * 60 * 1000;

let canal = null;
let idleTimer = null;
let lastActivity = Date.now();

function limpiarLocal() {
  for (const key of CLAVES) {
    localStorage.removeItem(key);
  }
}

function snapshot() {
  const data = {};
  for (const key of CLAVES) {
    data[key] = sessionStorage.getItem(key);
  }
  return data;
}

function applySnapshot(data) {
  if (!data || typeof data !== 'object') return;
  for (const key of CLAVES) {
    const val = data[key];
    if (val) sessionStorage.setItem(key, val);
    else sessionStorage.removeItem(key);
  }
  limpiarLocal();
}

function getCanal() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!canal) {
    canal = new BroadcastChannel(CANAL);
    canal.addEventListener('message', onMensajeCanal);
  }
  return canal;
}

function postCanal(msg) {
  const ch = getCanal();
  if (ch) ch.postMessage(msg);
}

function onMensajeCanal(ev) {
  const msg = ev.data || {};
  if (msg.tipo === 'pedir' && haySesion()) {
    postCanal({ tipo: 'sesion', datos: snapshot() });
    return;
  }
  if (msg.tipo === 'sesion' && msg.datos) {
    applySnapshot(msg.datos);
    return;
  }
  if (msg.tipo === 'login' && msg.datos) {
    applySnapshot(msg.datos);
    return;
  }
  if (msg.tipo === 'logout') {
    for (const key of CLAVES) sessionStorage.removeItem(key);
    limpiarLocal();
    if (!window.location.pathname.endsWith('/index.html') && window.location.pathname !== '/') {
      window.location.replace(LOGIN);
    }
    return;
  }
  if (msg.tipo === 'actividad') {
    lastActivity = Date.now();
    programarIdle();
  }
}

export function leer() {
  limpiarLocal();
  return {
    loginType: sessionStorage.getItem('loginType') || 'admin',
    token: sessionStorage.getItem('token'),
    usuario: sessionStorage.getItem('usuario'),
  };
}

export function guardar({ loginType, token, usuario } = {}) {
  limpiarLocal();
  sessionStorage.removeItem('o365session');
  if (loginType != null) sessionStorage.setItem('loginType', loginType);
  if (token != null) sessionStorage.setItem('token', token);
  if (usuario != null) sessionStorage.setItem('usuario', usuario);
  postCanal({ tipo: 'login', datos: snapshot() });
}

export function haySesion() {
  const s = leer();
  return Boolean(s.token && s.usuario);
}

export function pedirSesionAOtrasPestanas() {
  return new Promise((resolve) => {
    if (haySesion()) {
      resolve(true);
      return;
    }
    const ch = getCanal();
    if (!ch) {
      resolve(false);
      return;
    }

    const terminar = (ok) => {
      clearTimeout(timer);
      ch.removeEventListener('message', onReply);
      resolve(ok);
    };

    const onReply = (ev) => {
      if (ev.data?.tipo === 'sesion' && ev.data.datos) {
        applySnapshot(ev.data.datos);
        terminar(haySesion());
      }
    };

    const timer = setTimeout(() => terminar(haySesion()), 300);
    ch.addEventListener('message', onReply);
    postCanal({ tipo: 'pedir' });
  });
}

export async function resolverSesion() {
  getCanal();
  if (haySesion()) return leer();
  await pedirSesionAOtrasPestanas();
  return leer();
}

export function cerrar() {
  for (const key of CLAVES) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
  postCanal({ tipo: 'logout' });
}

export function escucharCierreEnOtrasPestanas() {
  getCanal();
}

function programarIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  const restante = IDLE_MS - (Date.now() - lastActivity);
  idleTimer = setTimeout(() => {
    if (Date.now() - lastActivity < IDLE_MS) {
      programarIdle();
      return;
    }
    if (!haySesion()) return;
    cerrar();
    window.location.replace(LOGIN);
  }, Math.max(1000, restante));
}

function marcarActividad({ broadcast = true } = {}) {
  lastActivity = Date.now();
  programarIdle();
  if (broadcast) postCanal({ tipo: 'actividad' });
}

export function iniciarVigilanciaInactividad() {
  getCanal();
  lastActivity = Date.now();
  programarIdle();
  const opts = { passive: true };
  ['pointerdown', 'keydown', 'click', 'scroll', 'touchstart'].forEach((ev) => {
    window.addEventListener(ev, () => marcarActividad({ broadcast: true }), opts);
  });
}
