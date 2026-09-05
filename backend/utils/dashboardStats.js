function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function diaBogota(isoOrFecha) {
  const raw = String(isoOrFecha ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function mesBogota(isoOrFecha) {
  const day = diaBogota(isoOrFecha);
  return day ? day.slice(0, 7) : '';
}

function inRango(isoOrFecha, desde, hasta) {
  const day = diaBogota(isoOrFecha);
  if (!day) return !desde && !hasta;
  if (desde && day < desde) return false;
  if (hasta && day > hasta) return false;
  return true;
}

function matchesSede(row, sedeFiltro) {
  if (!sedeFiltro) return true;
  const q = String(sedeFiltro).toLowerCase();
  return (
    String(row.ubicacionFisica ?? '').toLowerCase() === q ||
    String(row.sede ?? '').toLowerCase() === q ||
    String(row.sedeCodigo ?? '').toLowerCase() === q
  );
}

function matchesTecnico(row, tecnicoFiltro) {
  if (!tecnicoFiltro) return true;
  return String(row.cedulaTecnico ?? '') === String(tecnicoFiltro);
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item) || 'Sin dato';
    map.set(key, (map.get(key) || 0) + 1);
  }
  const total = items.length;
  return [...map.entries()]
    .map(([label, count]) => ({ label, count, porcentaje: pct(count, total) }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), 'es'));
}

function countByMes(items, dateFn) {
  const map = new Map();
  for (const item of items) {
    const mes = dateFn(item);
    if (!mes) continue;
    map.set(mes, (map.get(mes) || 0) + 1);
  }
  const total = items.length;
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count, porcentaje: pct(count, total) }));
}

function topLabel(rows) {
  return rows?.[0]?.label || '—';
}

function paginate(items, page = 1, limit = 10) {
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(pageNum, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

function collectTecnicos(rows) {
  const map = new Map();
  for (const row of rows) {
    const cedula = String(row.cedulaTecnico || '').trim();
    if (!cedula) continue;
    if (!map.has(cedula)) {
      map.set(cedula, { cedula, nombre: row.nombreTecnico || cedula });
    }
  }
  return [...map.values()].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
}

module.exports = {
  pct,
  diaBogota,
  mesBogota,
  inRango,
  matchesSede,
  matchesTecnico,
  countBy,
  countByMes,
  topLabel,
  paginate,
  collectTecnicos,
};
