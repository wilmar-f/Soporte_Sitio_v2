const { readAll: readDiagnosticos } = require('../utils/diagnosticosStore');
const { readAll: readFotos } = require('../utils/videoconferenciaLog');
const { getCatalogo } = require('../utils/readVideoconferencia');

const TIPOS_LABEL = {
  ESTANDAR: 'DIAGNOSTICO CON ACTIVOS',
  GESTOR_GARANTIAS: 'DIAGNOSTICO CON GESTOR GARANTIAS',
  RENOVACION: 'DIAGNOSTICO RENOVACION',
  DAAS: 'DAAS',
};

function horaBogota(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  return Number(parts.find(p => p.type === 'hour')?.value ?? '0');
}

function diaBogota(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function matchesSede(row, sedeFiltro) {
  if (!sedeFiltro) return true;
  const q = sedeFiltro.toLowerCase();
  return (
    String(row.sede ?? '').toLowerCase() === q ||
    String(row.sedeCodigo ?? '').toLowerCase() === q
  );
}

function matchesTecnico(row, tecnicoFiltro) {
  if (!tecnicoFiltro) return true;
  return String(row.cedulaTecnico ?? '') === String(tecnicoFiltro);
}

function inRango(isoOrFecha, desde, hasta) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(isoOrFecha))
    ? String(isoOrFecha)
    : diaBogota(isoOrFecha);
  if (desde && day < desde) return false;
  if (hasta && day > hasta) return false;
  return true;
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

exports.getEstadisticas = (req, res) => {
  try {
    const desde = String(req.query.desde || '').trim();
    const hasta = String(req.query.hasta || '').trim();
    const sede = String(req.query.sede || '').trim();
    const tecnico = String(req.query.tecnico || '').trim();

    const diagsAll = readDiagnosticos();
    const fotosAll = readFotos();

    const diags = diagsAll.filter(row =>
      inRango(row.fecha || row.createdAt, desde, hasta) &&
      matchesSede(row, sede) &&
      matchesTecnico(row, tecnico)
    );
    const fotos = fotosAll.filter(row =>
      inRango(row.createdAt, desde, hasta) &&
      matchesSede(row, sede) &&
      matchesTecnico(row, tecnico)
    );

    const totalMixto = diags.length + fotos.length;
    const catalogo = getCatalogo();
    const sedesCatalogo = catalogo.map(s => s.sede);
    const sedesConFoto = new Set(fotos.map(f => f.sede));
    const cobertura = sedesCatalogo.length
      ? pct(sedesCatalogo.filter(s => sedesConFoto.has(s)).length, sedesCatalogo.length)
      : 0;

    const horas = Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      label: `${String(h).padStart(2, '0')}:00`,
      count: 0,
      porcentaje: 0,
    }));
    for (const foto of fotos) {
      const h = horaBogota(foto.createdAt);
      if (h >= 0 && h <= 23) horas[h].count += 1;
    }
    for (const slot of horas) {
      slot.porcentaje = pct(slot.count, fotos.length);
    }

    const tecnicosMap = new Map();
    for (const row of [...diagsAll, ...fotosAll]) {
      const cedula = String(row.cedulaTecnico || '').trim();
      if (!cedula) continue;
      if (!tecnicosMap.has(cedula)) {
        tecnicosMap.set(cedula, {
          cedula,
          nombre: row.nombreTecnico || cedula,
        });
      }
    }

    const sedesFiltro = new Set([
      ...sedesCatalogo,
      ...diagsAll.map(d => d.sedeCodigo || d.sede).filter(Boolean),
      ...fotosAll.map(f => f.sede).filter(Boolean),
    ]);

    res.json({
      filtros: {
        sedes: [...sedesFiltro].sort((a, b) => String(a).localeCompare(String(b), 'es')),
        tecnicos: [...tecnicosMap.values()].sort((a, b) =>
          String(a.nombre).localeCompare(String(b.nombre), 'es')
        ),
      },
      totales: {
        diagnosticos: diags.length,
        fotos: fotos.length,
        porcentajeDiagnosticos: pct(diags.length, totalMixto),
        porcentajeFotos: pct(fotos.length, totalMixto),
        coberturaSedesVc: cobertura,
        sedesCatalogo: sedesCatalogo.length,
        sedesConFoto: sedesConFoto.size,
      },
      diagnosticos: {
        porTipo: countBy(diags, r => TIPOS_LABEL[r.tipoDiagnostico] || r.tipoDiagnostico || 'Sin tipo'),
        porSede: countBy(diags, r => r.sedeCodigo || r.sede),
        porTecnico: countBy(diags, r => r.nombreTecnico || r.cedulaTecnico),
      },
      videoconferencia: {
        porSede: countBy(fotos, r => r.sede),
        porSala: countBy(fotos, r => `${r.sede} / ${r.sala}`),
        porTecnico: countBy(fotos, r => r.nombreTecnico || r.cedulaTecnico),
        porHora: horas,
      },
    });
  } catch (err) {
    console.error('Error en estadísticas:', err);
    res.status(500).json({ error: err.message || 'No se pudieron calcular las estadísticas' });
  }
};
