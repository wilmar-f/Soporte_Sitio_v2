/**
 * admin-usuarios.js — Panel de gestión de usuarios (solo administrador).
 * Permite buscar técnicos y restablecer contraseñas olvidadas.
 */
import { toast } from './toast.js';

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_COMPLEXITY_MSG =
  'La nueva contraseña debe tener al menos 6 caracteres, una letra mayúscula, un número y un carácter especial (. * + -).';

let state = {
  q: '',
  token: '',
  resetCedula: '',
  resetNombre: '',
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelRol(rol) {
  const r = String(rol ?? '').toLowerCase();
  if (r === 'administrador') return 'Administrador';
  return 'Técnico';
}

function validarComplejidadContrasena(contrasena) {
  const pwd = String(contrasena);
  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: PASSWORD_COMPLEXITY_MSG };
  }
  const valid =
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[.*+\-]/.test(pwd);
  return valid ? { ok: true } : { ok: false, error: PASSWORD_COMPLEXITY_MSG };
}

function renderRows(tecnicos) {
  if (!tecnicos.length) {
    return '<tr><td colspan="5" class="noticias-empty">No hay usuarios que coincidan con la búsqueda.</td></tr>';
  }

  return tecnicos.map((t) => `
    <tr>
      <td>${esc(t.cedula)}</td>
      <td>${esc(t.nombreCompleto)}</td>
      <td>${esc(t.cargo || '—')}</td>
      <td>${esc(labelRol(t.rol))}</td>
      <td>
        <button type="button" class="btn btn--outline btn--sm admin-usuarios-btn-reset"
          data-cedula="${esc(t.cedula)}"
          data-nombre="${esc(t.nombreCompleto)}">
          Restablecer
        </button>
      </td>
    </tr>
  `).join('');
}

async function loadAndRender() {
  const tbody = document.getElementById('admin-usuarios-tbody');
  const meta = document.getElementById('admin-usuarios-meta');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="noticias-empty">Cargando…</td></tr>';

  try {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);

    const res = await fetch(`/api/admin/tecnicos?${params}`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'No se pudo cargar la lista de usuarios');
    }

    const tecnicos = data.tecnicos || [];
    tbody.innerHTML = renderRows(tecnicos);

    if (meta) {
      meta.textContent = tecnicos.length
        ? `${tecnicos.length} usuario${tecnicos.length === 1 ? '' : 's'} mostrado${tecnicos.length === 1 ? '' : 's'}`
        : 'Sin resultados';
    }
  } catch (err) {
    console.error('Error cargando usuarios:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="noticias-empty noticias-empty--error">${esc(err.message)}</td></tr>`;
    if (meta) meta.textContent = '';
    toast('No se pudo cargar la lista de usuarios.', 'error');
  }
}

function abrirModalReset(cedula, nombre) {
  state.resetCedula = cedula;
  state.resetNombre = nombre;

  const modal = document.getElementById('modal-reset-contrasena');
  const subtitulo = document.getElementById('modal-reset-subtitulo');
  const form = document.getElementById('form-reset-contrasena');

  if (subtitulo) {
    subtitulo.textContent = `${nombre} (cédula ${cedula})`;
  }
  form?.reset();
  if (modal) {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
  }
  document.getElementById('reset-clave-nueva')?.focus();
}

function cerrarModalReset() {
  const modal = document.getElementById('modal-reset-contrasena');
  if (modal) {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }
  document.getElementById('form-reset-contrasena')?.reset();
  state.resetCedula = '';
  state.resetNombre = '';
}

async function enviarReset(e) {
  e.preventDefault();

  const contrasenaNueva = document.getElementById('reset-clave-nueva')?.value || '';
  const contrasenaConfirmacion = document.getElementById('reset-clave-confirmar')?.value || '';

  if (contrasenaNueva !== contrasenaConfirmacion) {
    toast('La nueva contraseña y la confirmación no coinciden.', 'advertencia');
    return;
  }

  const complejidad = validarComplejidadContrasena(contrasenaNueva);
  if (!complejidad.ok) {
    toast(complejidad.error, 'advertencia');
    return;
  }

  const btnGuardar = document.getElementById('btn-reset-guardar');
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';
  }

  try {
    const res = await fetch('/api/admin/reset-contrasena', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({
        cedula: state.resetCedula,
        contrasenaNueva,
        contrasenaConfirmacion,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast(data.error || 'No se pudo restablecer la contraseña.', 'error');
      return;
    }

    toast(
      data.mensaje || 'Contraseña restablecida. Comuníquela al técnico por un canal seguro.',
      'exito'
    );
    cerrarModalReset();
  } catch (err) {
    console.error('Error restableciendo contraseña:', err);
    toast('Error de conexión al restablecer la contraseña.', 'error');
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Restablecer';
    }
  }
}

function bindPanelEvents() {
  const panel = document.getElementById('panel-principal');
  if (!panel || panel.dataset.adminUsuariosBound === '1') return;
  panel.dataset.adminUsuariosBound = '1';

  let debounceTimer;
  panel.addEventListener('input', (e) => {
    if (e.target.id !== 'admin-usuarios-busqueda') return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.q = e.target.value.trim();
      loadAndRender();
    }, 300);
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.admin-usuarios-btn-reset');
    if (!btn) return;
    abrirModalReset(btn.dataset.cedula, btn.dataset.nombre);
  });
}

function bindModalEvents() {
  const form = document.getElementById('form-reset-contrasena');
  const btnCancelar = document.getElementById('btn-reset-cancelar');
  const backdrop = document.getElementById('modal-reset-backdrop');

  if (form?.dataset.bound === '1') return;
  if (form) form.dataset.bound = '1';

  form?.addEventListener('submit', enviarReset);
  btnCancelar?.addEventListener('click', cerrarModalReset);
  backdrop?.addEventListener('click', cerrarModalReset);
}

/**
 * @param {string} token JWT del administrador
 */
export async function renderPanelUsuarios(token) {
  state = { q: '', token: token || '', resetCedula: '', resetNombre: '' };

  const panel = document.getElementById('panel-principal');
  panel.innerHTML = `
    <div class="noticias-panel admin-usuarios-panel">
      <div class="noticias-header">
        <div>
          <h2 class="noticias-titulo">Usuarios — Restablecer contraseña</h2>
          <p class="noticias-subtitulo">Busque al técnico y asigne una contraseña temporal</p>
        </div>
        <div class="noticias-busqueda-wrap">
          <label for="admin-usuarios-busqueda" class="noticias-busqueda-label">Buscar por cédula o nombre</label>
          <input type="search" id="admin-usuarios-busqueda" class="noticias-busqueda" placeholder="Cédula o nombre…" autocomplete="off">
        </div>
      </div>

      <div class="noticias-table-wrap">
        <table class="noticias-table" aria-label="Lista de usuarios">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Rol</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="admin-usuarios-tbody">
            <tr><td colspan="5" class="noticias-empty">Cargando…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="noticias-footer">
        <p class="noticias-meta" id="admin-usuarios-meta"></p>
      </div>
    </div>
  `;

  panel.dataset.adminUsuariosBound = '0';
  panel.dataset.noticiasBound = '0';
  bindPanelEvents();
  bindModalEvents();
  await loadAndRender();
}

export function cerrarModalResetAdmin() {
  cerrarModalReset();
}
