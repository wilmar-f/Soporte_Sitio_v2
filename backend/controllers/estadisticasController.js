const { listFotos } = require('../utils/videoconferenciaLog');
const { getCatalogo } = require('../utils/readVideoconferencia');
const { pct } = require('../utils/dashboardStats');

exports.getEstadisticas = (req, res) => {
  try {
    const desde = String(req.query.desde || '').trim();
    const hasta = String(req.query.hasta || '').trim();
    const sede = String(req.query.sede || '').trim();
    const tecnico = String(req.query.tecnico || '').trim();
    const page = req.query.page;
    const limit = req.query.limit || 10;

    const result = listFotos({ desde, hasta, sede, tecnico, page, limit });

    let catalogo = [];
    try {
      catalogo = getCatalogo();
    } catch {
      catalogo = [];
    }

    const sedesCatalogo = catalogo.map(s => s.sede);
    const sedesConFoto = new Set((result.agregados.porSede || []).map(s => s.label).filter(l => l !== 'Sin dato'));
    const cobertura = sedesCatalogo.length
      ? pct(sedesCatalogo.filter(s => sedesConFoto.has(s)).length, sedesCatalogo.length)
      : 0;

    const sedesFiltro = [...new Set([...sedesCatalogo, ...result.filtros.sedes])]
      .sort((a, b) => String(a).localeCompare(String(b), 'es'));

    res.json({
      ...result,
      filtros: {
        sedes: sedesFiltro,
        tecnicos: result.filtros.tecnicos,
      },
      agregados: {
        ...result.agregados,
        kpis: {
          ...result.agregados.kpis,
          coberturaSedesVc: cobertura,
          sedesCatalogo: sedesCatalogo.length,
          sedesConFoto: sedesConFoto.size,
        },
      },
    });
  } catch (err) {
    console.error('Error en estadísticas:', err);
    res.status(500).json({ error: err.message || 'No se pudieron calcular las estadísticas' });
  }
};
