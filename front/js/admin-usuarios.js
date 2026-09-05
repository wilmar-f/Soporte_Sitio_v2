/**
 * admin-usuarios.js — CRUD de técnicos (solo administrador).
 */
import { toast } from './toast.js';

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_COMPLEXITY_MSG =
  'La nueva contraseña debe tener al menos 6 caracteres, una letra mayúscula, un número y un carácter especial (. * + -).';

let state = {
  q: '',
  token: '',
  mode: 'create',
  cedulaOriginal: '',
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelRol(rol) {
  return String(rol ?? '').toLowerCase() === 'administrador' ? 'Administrador' : 'Técnico';
}

function validarComplejidadContrasena(contrasena) {
  const pwd = String(contrasena);
  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: PASSWORD_COMPLEXITY_MSG };
  }
  const valid = /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[.*+\-]/.test(pwd);
  return valid ? { ok: true } : { ok: false, error: PASSWORD_COMPLEXITY_MSG };
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${state.token}`,
  };
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
      <td class="admin-usuarios-acciones">
        <button type="button" class="btn btn--outline btn--sm admin-usuarios-btn-editar"
          data-cedula="${esc(t.cedula)}"
          data-nombre="${esc(t.nombreCompleto)}"
          data-cargo="${esc(t.cargo || '')}"
          data-rol="${esc(t.rol || 'tecnico')}">
          Editar
        </button>
        <button type="button" class="btn btn--outline btn--sm admin-usuarios-btn-eliminar"
          data-cedula="${esc(t.cedula)}"
          data-nombre="${esc(t.nombreCompleto)}">
          Eliminar
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

function abrirModalCrear() {
  state.mode = 'create';
  state.cedulaOriginal = '';

  document.getElementById('modal-usuario-titulo').textContent = 'Nuevo usuario';
  document.getElementById('modal-usuario-subtitulo').textContent = 'La contraseña temporal es obligatoria.';
  document.getElementById('usuario-clave-label').textContent = 'Contraseña temporal';
  document.getElementById('usuario-clave-ayuda').textContent =
    'Obligatoria. Mínimo 6 caracteres, con mayúscula, número y un carácter . * + -';

  const form = document.getElementById('form-usuario');
  form?.reset();
  document.getElementById('usuario-rol').value = 'tecnico';
  document.getElementById('usuario-clave').required = true;
  document.getElementById('usuario-clave-confirmar').required = true;

  mostrarModal();
  document.getElementById('usuario-cedula')?.focus();
}

function abrirModalEditar(user) {
  state.mode = 'edit';
  state.cedulaOriginal = user.cedula;

  document.getElementById('modal-usuario-titulo').textContent = 'Editar usuario';
  document.getElementById('modal-usuario-subtitulo').textContent =
    `${user.nombre} (cédula ${user.cedula}). Deje la contraseña vacía si no desea restablecerla.`;
  document.getElementById('usuario-clave-label').textContent = 'Nueva contraseña (opcional)';
  document.getElementById('usuario-clave-ayuda').textContent =
    'Solo si desea restablecerla. Mínimo 6 caracteres, con mayúscula, número y un carácter . * + -';

  const form = document.getElementById('form-usuario');
  form?.reset();
  document.getElementById('usuario-cedula').value = user.cedula;
  document.getElementById('usuario-nombre').value = user.nombre;
  document.getElementById('usuario-cargo').value = user.cargo || '';
  document.getElementById('usuario-rol').value = user.rol === 'administrador' ? 'administrador' : 'tecnico';
  document.getElementById('usuario-clave').required = false;
  document.getElementById('usuario-clave-confirmar').required = false;

  mostrarModal();
  document.getElementById('usuario-nombre')?.focus();
}

function mostrarModal() {
  const modal = document.getElementById('modal-usuario');
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
}

function cerrarModalUsuario() {
  const modal = document.getElementById('modal-usuario');
  if (modal) {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }
  document.getElementById('form-usuario')?.reset();
  state.mode = 'create';
  state.cedulaOriginal = '';
}

async function enviarUsuario(e) {
  e.preventDefault();

  const cedula = document.getElementById('usuario-cedula')?.value.trim() || '';
  const nombreCompleto = document.getElementById('usuario-nombre')?.value.trim() || '';
  const cargo = document.getElementById('usuario-cargo')?.value.trim() || '';
  const rol = document.getElementById('usuario-rol')?.value || 'tecnico';
  const contrasenaNueva = document.getElementById('usuario-clave')?.value || '';
  const contrasenaConfirmacion = document.getElementById('usuario-clave-confirmar')?.value || '';

  if (!cedula || !nombreCompleto) {
    toast('Cédula y nombre son requeridos.', 'advertencia');
    return;
  }

  const claveRequerida = state.mode === 'create';
  if (claveRequerida || contrasenaNueva || contrasenaConfirmacion) {
    if (contrasenaNueva !== contrasenaConfirmacion) {
      toast('La nueva contraseña y la confirmación no coinciden.', 'advertencia');
      return;
    }
    const complejidad = validarComplejidadContrasena(contrasenaNueva);
    if (!complejidad.ok) {
      toast(complejidad.error, 'advertencia');
      return;
    }
  }

  const btnGuardar = document.getElementById('btn-usuario-guardar');
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';
  }

  const payload = { cedula, nombreCompleto, cargo, rol };
  if (contrasenaNueva) {
    payload.contrasenaNueva = contrasenaNueva;
    payload.contrasenaConfirmacion = contrasenaConfirmacion;
  }

  try {
    const url = state.mode === 'create'
      ? '/api/admin/tecnicos'
      : `/api/admin/tecnicos/${encodeURIComponent(state.cedulaOriginal)}`;
    const res = await fetch(url, {
      method: state.mode === 'create' ? 'POST' : 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || 'No se pudo guardar el usuario.', 'error');
      return;
    }
    toast(data.mensaje || 'Usuario guardado.', 'exito');
    cerrarModalUsuario();
    await loadAndRender();
  } catch (err) {
    console.error('Error guardando usuario:', err);
    toast('Error de conexión al guardar el usuario.', 'error');
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  }
}

async function eliminarUsuario(cedula, nombre) {
  const ok = window.confirm(`¿Eliminar a ${nombre} (cédula ${cedula})? Esta acción no se puede deshacer.`);
  if (!ok) return;

  try {
    const res = await fetch(`/api/admin/tecnicos/${encodeURIComponent(cedula)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${state.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || 'No se pudo eliminar el usuario.', 'error');
      return;
    }
    toast(data.mensaje || 'Usuario eliminado.', 'exito');
    await loadAndRender();
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    toast('Error de conexión al eliminar el usuario.', 'error');
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
    if (e.target.closest('#btn-usuario-nuevo')) {
      abrirModalCrear();
      return;
    }
    const editar = e.target.closest('.admin-usuarios-btn-editar');
    if (editar) {
      abrirModalEditar({
        cedula: editar.dataset.cedula,
        nombre: editar.dataset.nombre,
        cargo: editar.dataset.cargo,
        rol: editar.dataset.rol,
      });
      return;
    }
    const eliminar = e.target.closest('.admin-usuarios-btn-eliminar');
    if (eliminar) {
      eliminarUsuario(eliminar.dataset.cedula, eliminar.dataset.nombre);
    }
  });
}

function bindModalEvents() {
  const form = document.getElementById('form-usuario');
  const btnCancelar = document.getElementById('btn-usuario-cancelar');
  const backdrop = document.getElementById('modal-usuario-backdrop');

  if (form?.dataset.bound === '1') return;
  if (form) form.dataset.bound = '1';

  form?.addEventListener('submit', enviarUsuario);
  btnCancelar?.addEventListener('click', cerrarModalUsuario);
  backdrop?.addEventListener('click', cerrarModalUsuario);
}

export async function renderPanelUsuarios(token) {
  state = { q: '', token: token || '', mode: 'create', cedulaOriginal: '' };

  const panel = document.getElementById('panel-principal');
  panel.innerHTML = `
    <div class="noticias-panel admin-usuarios-panel">
      <div class="noticias-header">
        <div>
          <h2 class="noticias-titulo">Usuarios</h2>
          <p class="noticias-subtitulo">Crear, editar o eliminar técnicos. La contraseña se restablece al editar si la completa.</p>
        </div>
        <div class="admin-usuarios-toolbar">
          <div class="noticias-busqueda-wrap">
            <label for="admin-usuarios-busqueda" class="noticias-busqueda-label">Buscar por cédula o nombre</label>
            <input type="search" id="admin-usuarios-busqueda" class="noticias-busqueda" placeholder="Cédula o nombre…" autocomplete="off">
          </div>
          <button type="button" class="btn btn--primario" id="btn-usuario-nuevo">Nuevo usuario</button>
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
              <th>Acciones</th>
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
  cerrarModalUsuario();
}
