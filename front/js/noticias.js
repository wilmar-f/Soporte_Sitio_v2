/**
 * noticias.js — Panel de consulta de diagnósticos (solo administrador).
 */
import { toast } from './toast.js';

const TIPOS_LABEL = {
  ESTANDAR: 'DIAGNOSTICO CON ACTIVOS',
  DAAS: 'DAAS',
  OBSOLESCENCIA: 'OBSOLESCENCIA',
};

const PAGE_SIZE = 20;

let state = {
  q: '',
  anio: '',
  tipo: '',
  page: 1,
  token: '',
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelTipo(value) {
  const key = String(value ?? '').toUpperCase();
  return TIPOS_LABEL[key] || key || '—';
}

function formatFecha(value) {
  const s = String(value ?? '').trim();
  if (!s) return '—';
  const parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (parts) return `${parts[3]}/${parts[2]}/${parts[1]}`;
  return s;
}

function buildAnioOptions(anios, selected) {
  const opts = ['<option value="">Todos los años</option>'];
  for (const y of anios) {
    opts.push(`<option value="${y}" ${String(selected) === String(y) ? 'selected' : ''}>${y}</option>`);
  }
  return opts.join('');
}

function buildTipoOptions(selected) {
  const opts = [
    { value: '', label: 'Todos los tipos' },
    { value: 'ESTANDAR', label: 'DIAGNOSTICO CON ACTIVOS' },
    { value: 'DAAS', label: 'DAAS' },
    { value: 'OBSOLESCENCIA', label: 'OBSOLESCENCIA' },
  ];
  return opts.map(o =>
    `<option value="${o.value}" ${selected === o.value ? 'selected' : ''}>${o.label}</option>`
  ).join('');
}

function buildPagination(page, totalPages) {
  if (totalPages <= 1) return '';

  const pages = [];
  const addBtn = (p, label = null, disabled = false, active = false) => {
    pages.push(
      `<button type="button" class="noticias-page-btn${active ? ' noticias-page-btn--activo' : ''}" data-page="${p}" ${disabled ? 'disabled' : ''}>${label ?? p}</button>`
    );
  };

  addBtn(page - 1, '‹', page <= 1);

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  if (start > 1) {
    addBtn(1, '1', false, page === 1);
    if (start > 2) pages.push('<span class="noticias-page-ellipsis">…</span>');
  }

  for (let p = start; p <= end; p++) {
    addBtn(p, String(p), false, p === page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('<span class="noticias-page-ellipsis">…</span>');
    addBtn(totalPages, String(totalPages), false, page === totalPages);
  }

  addBtn(page + 1, '›', page >= totalPages);

  return `<div class="noticias-pagination">${pages.join('')}</div>`;
}

function renderTableRows(items) {
  if (!items.length) {
    return '<tr><td colspan="5" class="noticias-empty">No hay diagnósticos que coincidan con los filtros.</td></tr>';
  }
  return items.map(row => `
    <tr>
      <td>${esc(formatFecha(row.fecha))}</td>
      <td>${esc(row.nombreTecnico || '—')}</td>
      <td>${esc(labelTipo(row.tipoDiagnostico))}</td>
      <td>${esc(row.serial || '—')}</td>
      <td>${esc(row.etiqueta || '—')}</td>
    </tr>
  `).join('');
}

function renderPanelContent(data) {
  const { items, total, page, totalPages, anios = [] } = data;
  const tbody = document.getElementById('noticias-tbody');
  const meta = document.getElementById('noticias-meta');
  const pagination = document.getElementById('noticias-pagination');

  if (tbody) tbody.innerHTML = renderTableRows(items);
  if (meta) {
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    meta.textContent = total
      ? `Mostrando ${from}–${to} de ${total} diagnóstico${total === 1 ? '' : 's'}`
      : 'Sin resultados';
  }
  if (pagination) pagination.innerHTML = buildPagination(page, totalPages);

  const anioSelect = document.getElementById('noticias-filtro-anio');
  if (anioSelect) {
    anioSelect.innerHTML = buildAnioOptions(anios, state.anio);
  }
}

async function fetchDiagnosticos() {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(PAGE_SIZE),
  });
  if (state.q) params.set('q', state.q);
  if (state.anio) params.set('anio', state.anio);
  if (state.tipo) params.set('tipo', state.tipo);

  const res = await fetch(`/api/diagnosticos?${params}`, {
    headers: { Authorization: `Bearer ${state.token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

async function loadAndRender() {
  const tbody = document.getElementById('noticias-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="noticias-empty">Cargando…</td></tr>';
  }

  try {
    const data = await fetchDiagnosticos();
    renderPanelContent(data);
  } catch (err) {
    console.error('Error cargando noticias:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="noticias-empty noticias-empty--error">${esc(err.message)}</td></tr>`;
    }
    toast('No se pudo cargar el historial de diagnósticos.', 'error');
  }
}

function bindPanelEvents() {
  const panel = document.getElementById('panel-principal');
  if (!panel || panel.dataset.noticiasBound === '1') return;
  panel.dataset.noticiasBound = '1';

  let debounceTimer;
  panel.addEventListener('input', (e) => {
    if (e.target.id !== 'noticias-busqueda') return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.q = e.target.value.trim();
      state.page = 1;
      loadAndRender();
    }, 300);
  });

  panel.addEventListener('change', (e) => {
    if (e.target.id === 'noticias-filtro-anio') {
      state.anio = e.target.value;
      state.page = 1;
      loadAndRender();
    }
    if (e.target.id === 'noticias-filtro-tipo') {
      state.tipo = e.target.value;
      state.page = 1;
      loadAndRender();
    }
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.noticias-page-btn');
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page, 10);
    if (!Number.isNaN(page) && page >= 1) {
      state.page = page;
      loadAndRender();
    }
  });
}

/**
 * @param {string} token JWT del administrador
 */
export async function renderPanelNoticias(token) {
  state = { q: '', anio: '', tipo: '', page: 1, token: token || '' };

  const panel = document.getElementById('panel-principal');
  panel.innerHTML = `
    <div class="noticias-panel">
      <div class="noticias-header">
        <div>
          <h2 class="noticias-titulo">Noticias — Diagnósticos realizados</h2>
          <p class="noticias-subtitulo">Consulta de historial (solo lectura)</p>
        </div>
        <div class="noticias-busqueda-wrap">
          <label for="noticias-busqueda" class="noticias-busqueda-label">Buscar por serial o placa</label>
          <input type="search" id="noticias-busqueda" class="noticias-busqueda" placeholder="Serial o etiqueta…" autocomplete="off">
        </div>
      </div>

      <div class="noticias-table-wrap">
        <table class="noticias-table" aria-label="Historial de diagnósticos">
          <thead>
            <tr>
              <th>
                Fecha
                <select id="noticias-filtro-anio" class="noticias-filtro" aria-label="Filtrar por año">
                  <option value="">Todos los años</option>
                </select>
              </th>
              <th>Técnico</th>
              <th>
                Tipo diagnóstico
                <select id="noticias-filtro-tipo" class="noticias-filtro" aria-label="Filtrar por tipo">
                  ${buildTipoOptions('')}
                </select>
              </th>
              <th>Serial</th>
              <th>Placa</th>
            </tr>
          </thead>
          <tbody id="noticias-tbody">
            <tr><td colspan="5" class="noticias-empty">Cargando…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="noticias-footer">
        <p class="noticias-meta" id="noticias-meta"></p>
        <div id="noticias-pagination"></div>
      </div>
    </div>
  `;

  panel.dataset.noticiasBound = '0';
  bindPanelEvents();
  await loadAndRender();
}

export function esRolAdministrador(rol) {
  return String(rol ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') === 'administrador';
}
