/**
 * admin-usuarios.js — Consulta de técnicos (solo administrador, solo lectura).
 */
import { toast } from './toast.js';

let state = { q: '', token: '' };

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

function renderRows(tecnicos) {
  if (!tecnicos.length) {
    return '<tr><td colspan="4" class="noticias-empty">No hay usuarios que coincidan con la búsqueda.</td></tr>';
  }

  return tecnicos.map((t) => `
    <tr>
      <td>${esc(t.cedula)}</td>
      <td>${esc(t.nombreCompleto)}</td>
      <td>${esc(t.cargo || '—')}</td>
      <td>${esc(labelRol(t.rol))}</td>
    </tr>
  `).join('');
}

function panelSigueUsuarios() {
  const panel = document.getElementById('panel-principal');
  return panel && panel.dataset.panelActivo === 'usuarios';
}

async function loadAndRender() {
  if (!panelSigueUsuarios()) return;
  const tbody = document.getElementById('admin-usuarios-tbody');
  const meta = document.getElementById('admin-usuarios-meta');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" class="noticias-empty">Cargando…</td></tr>';

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
    tbody.innerHTML = `<tr><td colspan="4" class="noticias-empty noticias-empty--error">${esc(err.message)}</td></tr>`;
    if (meta) meta.textContent = '';
    toast('No se pudo cargar la lista de usuarios.', 'error');
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
}

export async function renderPanelUsuarios(token) {
  state = { q: '', token: token || '' };

  const panel = document.getElementById('panel-principal');
  panel.dataset.panelActivo = 'usuarios';
  panel.innerHTML = `
    <div class="noticias-panel admin-usuarios-panel">
      <div class="noticias-header">
        <div>
          <h2 class="noticias-titulo">Usuarios</h2>
          <p class="noticias-subtitulo">Consulta de técnicos. Altas y contraseñas se actualizan en tecnicos.xlsx con commit y push.</p>
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
            </tr>
          </thead>
          <tbody id="admin-usuarios-tbody">
            <tr><td colspan="4" class="noticias-empty">Cargando…</td></tr>
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
  await loadAndRender();
}
