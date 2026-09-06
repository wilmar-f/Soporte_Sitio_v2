const CLAVES = ['token', 'usuario', 'loginType', 'o365session'];
const LOGIN = '/pages/index.html';

function get(store, key) {
  return store.getItem(key);
}

function setBoth(key, value) {
  if (value == null || value === '') {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
  sessionStorage.removeItem(key);
}

function migrarDesdeSession() {
  for (const key of CLAVES) {
    const local = localStorage.getItem(key);
    const ses = sessionStorage.getItem(key);
    if (!local && ses) {
      localStorage.setItem(key, ses);
    }
  }
}

export function leer() {
  migrarDesdeSession();
  return {
    loginType: get(localStorage, 'loginType') || 'admin',
    token: get(localStorage, 'token'),
    usuario: get(localStorage, 'usuario'),
    o365session: get(localStorage, 'o365session'),
  };
}

export function guardar({ loginType, token, usuario, o365session } = {}) {
  if (loginType != null) setBoth('loginType', loginType);
  if (token != null) setBoth('token', token);
  if (usuario != null) setBoth('usuario', usuario);
  if (o365session != null) setBoth('o365session', o365session);
}

export function haySesion() {
  const s = leer();
  return Boolean(
    (s.loginType === 'office365' && s.o365session) ||
    (s.token && s.usuario)
  );
}

export function cerrar() {
  for (const key of CLAVES) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function escucharCierreEnOtrasPestanas() {
  window.addEventListener('storage', (e) => {
    if (!e.key || !CLAVES.includes(e.key)) return;
    if (haySesion()) return;
    window.location.replace(LOGIN);
  });
}
