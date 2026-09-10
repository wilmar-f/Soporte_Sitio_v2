/**
 * estadisticas.js — Dashboard Salas (videoconferencia, solo administrador).
 */
import { toast } from './toast.js';
import {
  esc,
  renderBars,
  renderPie,
  renderKpis,
  buildPagination,
  fillSelect,
  formatFechaHora,
} from './dashboard-charts.js';

const PAGE_SIZE = 10;

let state = { token: '', desde: '', hasta: '', sede: '', tecnico: '', page: 1 };

function renderTableRows(items) {
  if (!items.length) {
    return '<tr><td colspan="5" class="noticias-empty">Sin fotos en el filtro. Las subidas empiezan a contar desde ahora.</td></tr>';
  }
  return items.map(row => `
    <tr>
      <td>${esc(formatFechaHora(row.createdAt))}</td>
      <td>${esc(row.sede || '—')}</td>
      <td>${esc(row.sala || '—')}</td>
      <td>${esc(row.nombreTecnico || row.cedulaTecnico || '—')}</td>
      <td>${esc(row.filename || '—')}</td>
    </tr>
  `).join('');
}

function bindFilters() {
  const panel = document.getElementById('stats-panel');
  if (!panel || panel.dataset.bound === '1') return;
  panel.dataset.bound = '1';

  panel.addEventListener('change', (e) => {
    const map = {
      'stats-desde': 'desde',
      'stats-hasta': 'hasta',
      'stats-sede': 'sede',
      'stats-tecnico': 'tecnico',
    };
    const key = map[e.target.id];
    if (!key) return;
    state[key] = e.target.value;
    state.page = 1;
    loadAndRender();
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

function panelSigueEstadisticas() {
  const panel = document.getElementById('panel-principal');
  return panel && panel.dataset.panelActivo === 'estadisticas';
}

async function loadAndRender() {
  if (!panelSigueEstadisticas()) return;
  const qs = new URLSearchParams({
    page: String(state.page),
    limit: String(PAGE_SIZE),
  });
  if (state.desde) qs.set('desde', state.desde);
  if (state.hasta) qs.set('hasta', state.hasta);
  if (state.sede) qs.set('sede', state.sede);
  if (state.tecnico) qs.set('tecnico', state.tecnico);

  const tbody = document.getElementById('stats-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="noticias-empty">Cargando…</td></tr>';

  try {
    const res = await fetch(`/api/estadisticas?${qs}`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || 'No se pudieron cargar las estadísticas.', 'error');
      return;
    }
    if (!panelSigueEstadisticas()) return;

    fillSelect(
      'stats-sede',
      (data.filtros?.sedes || []).map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join(''),
      state.sede,
      'Todas las sedes'
    );
    fillSelect(
      'stats-tecnico',
      (data.filtros?.tecnicos || []).map(t =>
        `<option value="${esc(t.cedula)}">${esc(t.nombre)} (${esc(t.cedula)})</option>`
      ).join(''),
      state.tecnico,
      'Todos los técnicos'
    );

    if (tbody) tbody.innerHTML = renderTableRows(data.items || []);

    const meta = document.getElementById('stats-meta');
    const pagination = document.getElementById('stats-pagination');
    const total = data.total || 0;
    const page = data.page || 1;
    if (meta) {
      const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
      const to = Math.min(page * PAGE_SIZE, total);
      meta.textContent = total
        ? `Mostrando ${from}–${to} de ${total} foto${total === 1 ? '' : 's'}`
        : 'Sin resultados';
    }
    if (pagination) pagination.innerHTML = buildPagination(page, data.totalPages || 1);

    const k = data.agregados?.kpis || {};
    const kpiEl = document.getElementById('stats-kpi');
    if (kpiEl) {
      kpiEl.innerHTML = renderKpis([
        { value: k.total ?? 0, label: 'Fotos videoconferencia', hint: 'En el filtro actual' },
        { value: k.sedeTop || '—', label: 'Sede con más fotos' },
        { value: k.tecnicoTop || '—', label: 'Técnico más activo' },
        {
          value: `${k.sedesConFoto ?? 0}/${k.sedesCatalogo ?? 0}`,
          label: 'Sedes VC con foto',
          hint: `${k.coberturaSedesVc ?? 0}% de cobertura`,
        },
      ]);
    }

    const vacio = 'Sin fotos en el filtro. Las subidas empiezan a contar desde ahora.';
    const agg = data.agregados || {};
    const sedeEl = document.getElementById('stats-vc-sede');
    const tecEl = document.getElementById('stats-vc-tec');
    const salaEl = document.getElementById('stats-vc-sala');
    const tortaEl = document.getElementById('stats-vc-torta');
    if (sedeEl) sedeEl.innerHTML = renderBars(agg.porSede, vacio);
    if (tecEl) tecEl.innerHTML = renderBars(agg.porTecnico, 'Sin fotos por técnico.');
    if (salaEl) salaEl.innerHTML = renderBars(agg.porSala, vacio);
    if (tortaEl) tortaEl.innerHTML = renderPie(agg.porSede, vacio, 'Fotos por sede');
  } catch {
    toast('Error de conexión al cargar el dashboard de salas.', 'error');
  }
}

export async function renderPanelEstadisticas(token) {
  state = { token: token || '', desde: '', hasta: '', sede: '', tecnico: '', page: 1 };

  const panel = document.getElementById('panel-principal');
  panel.dataset.panelActivo = 'estadisticas';
  panel.innerHTML = `
    <div class="stats-panel dash-panel" id="stats-panel">
      <div class="noticias-header">
        <div>
          <h2 class="noticias-titulo">Dashboard Salas</h2>
          <p class="noticias-subtitulo">Fotos de videoconferencia (solo administrador)</p>
        </div>
      </div>

      <div class="stats-filters">
        <label class="stats-filter">
          Desde
          <input type="date" id="stats-desde">
        </label>
        <label class="stats-filter">
          Hasta
          <input type="date" id="stats-hasta">
        </label>
        <label class="stats-filter">
          Sede
          <select id="stats-sede"><option value="">Todas las sedes</option></select>
        </label>
        <label class="stats-filter">
          Técnico
          <select id="stats-tecnico"><option value="">Todos los técnicos</option></select>
        </label>
      </div>

      <div class="noticias-table-wrap">
        <table class="noticias-table" aria-label="Fotos de videoconferencia">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Sede</th>
              <th>Sala</th>
              <th>Técnico</th>
              <th>Archivo</th>
            </tr>
          </thead>
          <tbody id="stats-tbody">
            <tr><td colspan="5" class="noticias-empty">Cargando…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="noticias-footer">
        <p class="noticias-meta" id="stats-meta"></p>
        <div id="stats-pagination"></div>
      </div>

      <div class="stats-kpi" id="stats-kpi"></div>

      <section class="stats-block">
        <h3>Gráficos</h3>
        <div class="stats-grid">
          <div>
            <h4>Por sede</h4>
            <div id="stats-vc-sede"></div>
          </div>
          <div>
            <h4>Por técnico</h4>
            <div id="stats-vc-tec"></div>
          </div>
          <div class="stats-span">
            <h4>Por sala</h4>
            <div id="stats-vc-sala"></div>
          </div>
          <div class="stats-span">
            <h4>Fotos por sede</h4>
            <div id="stats-vc-torta"></div>
          </div>
        </div>
      </section>
    </div>
  `;

  bindFilters();
  await loadAndRender();
}
