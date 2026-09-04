/**
 * estadisticas.js — Dashboard admin (diagnósticos + videoconferencia).
 */
import { toast } from './toast.js';

let state = { token: '', desde: '', hasta: '', sede: '', tecnico: '' };

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBars(items, emptyMsg) {
  if (!items?.length) {
    return `<p class="stats-empty">${esc(emptyMsg)}</p>`;
  }
  return items.map(item => `
    <div class="stats-bar-row">
      <span class="stats-bar-label" title="${esc(item.label)}">${esc(item.label)}</span>
      <div class="stats-bar-track" aria-hidden="true">
        <div class="stats-bar-fill" style="width:${Math.min(100, item.porcentaje)}%"></div>
      </div>
      <span class="stats-bar-meta">${item.count} · ${item.porcentaje}%</span>
    </div>
  `).join('');
}

const PIE_COLORS = ['#1b6b4a', '#2d8f6f', '#c9a227', '#3d6ea8', '#c45c26', '#6b4c9a', '#4a9bb5', '#8b3a4a'];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startAngle, endAngle) {
  if (endAngle - startAngle >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

function renderPie(items, emptyMsg) {
  if (!items?.length) {
    return `<p class="stats-empty">${esc(emptyMsg)}</p>`;
  }
  const total = items.reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (total <= 0) {
    return `<p class="stats-empty">${esc(emptyMsg)}</p>`;
  }

  let angle = 0;
  const slices = items.map((item, i) => {
    const portion = (Number(item.count) / total) * 360;
    const start = angle;
    const end = angle + portion;
    angle = end;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    return { item, color, d: slicePath(80, 80, 74, start, end) };
  });

  return `
    <div class="stats-pie-wrap">
      <svg class="stats-pie" viewBox="0 0 160 160" role="img" aria-label="Fotos por sede">
        ${slices.map(s => `<path d="${s.d}" fill="${s.color}"><title>${esc(s.item.label)}: ${s.item.count} (${s.item.porcentaje}%)</title></path>`).join('')}
      </svg>
      <ul class="stats-pie-legend">
        ${slices.map(s => `
          <li>
            <span class="stats-pie-swatch" style="background:${s.color}"></span>
            <span class="stats-pie-name" title="${esc(s.item.label)}">${esc(s.item.label)}</span>
            <span class="stats-pie-meta">${s.item.count} · ${s.item.porcentaje}%</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function fillSelect(id, options, selected, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${esc(placeholder)}</option>` + options.join('');
  sel.value = selected;
}

function bindFilters() {
  const panel = document.getElementById('stats-panel');
  if (!panel || panel.dataset.bound === '1') return;
  panel.dataset.bound = '1';

  ['stats-desde', 'stats-hasta', 'stats-sede', 'stats-tecnico'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      state.desde = document.getElementById('stats-desde')?.value || '';
      state.hasta = document.getElementById('stats-hasta')?.value || '';
      state.sede = document.getElementById('stats-sede')?.value || '';
      state.tecnico = document.getElementById('stats-tecnico')?.value || '';
      loadAndRender();
    });
  });
}

async function loadAndRender() {
  const qs = new URLSearchParams();
  if (state.desde) qs.set('desde', state.desde);
  if (state.hasta) qs.set('hasta', state.hasta);
  if (state.sede) qs.set('sede', state.sede);
  if (state.tecnico) qs.set('tecnico', state.tecnico);

  try {
    const res = await fetch(`/api/estadisticas?${qs}`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || 'No se pudieron cargar las estadísticas.', 'error');
      return;
    }

    fillSelect(
      'stats-sede',
      data.filtros.sedes.map(s => `<option value="${esc(s)}" ${state.sede === s ? 'selected' : ''}>${esc(s)}</option>`),
      state.sede,
      'Todas las sedes'
    );
    fillSelect(
      'stats-tecnico',
      data.filtros.tecnicos.map(t =>
        `<option value="${esc(t.cedula)}" ${state.tecnico === t.cedula ? 'selected' : ''}>${esc(t.nombre)} (${esc(t.cedula)})</option>`
      ),
      state.tecnico,
      'Todos los técnicos'
    );

    const t = data.totales;
    document.getElementById('stats-kpi').innerHTML = `
      <div class="stats-kpi-card">
        <p class="stats-kpi-num">${t.diagnosticos}</p>
        <p class="stats-kpi-lbl">Diagnósticos</p>
        <p class="stats-kpi-pct">${t.porcentajeDiagnosticos}% del total mixto</p>
      </div>
      <div class="stats-kpi-card">
        <p class="stats-kpi-num">${t.fotos}</p>
        <p class="stats-kpi-lbl">Fotos videoconferencia</p>
        <p class="stats-kpi-pct">${t.porcentajeFotos}% del total mixto</p>
      </div>
      <div class="stats-kpi-card">
        <p class="stats-kpi-num">${t.sedesConFoto}/${t.sedesCatalogo}</p>
        <p class="stats-kpi-lbl">Sedes VC con foto</p>
        <p class="stats-kpi-pct">${t.coberturaSedesVc}% de cobertura</p>
      </div>
    `;

    document.getElementById('stats-diag-tipo').innerHTML = renderBars(data.diagnosticos.porTipo, 'Sin diagnósticos en el filtro.');
    document.getElementById('stats-diag-sede').innerHTML = renderBars(data.diagnosticos.porSede, 'Sin sede en los registros (los PDF anteriores no guardaban sede).');
    document.getElementById('stats-diag-tec').innerHTML = renderBars(data.diagnosticos.porTecnico, 'Sin diagnósticos por técnico.');
    const vacioVc = 'Sin fotos en el filtro. Las subidas empiezan a contar desde ahora.';
    document.getElementById('stats-vc-sede').innerHTML = renderBars(data.videoconferencia.porSede, vacioVc);
    document.getElementById('stats-vc-tec').innerHTML = renderBars(data.videoconferencia.porTecnico, 'Sin fotos por técnico.');
    document.getElementById('stats-vc-torta').innerHTML = renderPie(data.videoconferencia.porSede, vacioVc);
  } catch {
    toast('Error de conexión al cargar estadísticas.', 'error');
  }
}

export async function renderPanelEstadisticas(token) {
  state = { token: token || '', desde: '', hasta: '', sede: '', tecnico: '' };

  const panel = document.getElementById('panel-principal');
  panel.innerHTML = `
    <div class="stats-panel" id="stats-panel">
      <div class="noticias-header">
        <div>
          <h2 class="noticias-titulo">Estadísticas</h2>
          <p class="noticias-subtitulo">Diagnósticos y fotos de videoconferencia (solo administrador)</p>
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

      <div class="stats-kpi" id="stats-kpi"></div>

      <section class="stats-block">
        <h3>Diagnósticos</h3>
        <div class="stats-grid">
          <div>
            <h4>Por tipo</h4>
            <div id="stats-diag-tipo"></div>
          </div>
          <div>
            <h4>Por sede</h4>
            <div id="stats-diag-sede"></div>
          </div>
          <div class="stats-span">
            <h4>Por técnico</h4>
            <div id="stats-diag-tec"></div>
          </div>
        </div>
      </section>

      <section class="stats-block">
        <h3>VideoConferencia</h3>
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
