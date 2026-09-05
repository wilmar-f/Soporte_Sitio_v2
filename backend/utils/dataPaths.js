const fs = require('fs');
const path = require('path');

const SEED_DATA_DIR = path.join(__dirname, '../data');

function getDataDir() {
  return process.env.DATA_DIR || SEED_DATA_DIR;
}

/** En producción el CRUD debe vivir en disco persistente (DATA_DIR). */
function assertProductionDataDir() {
  if (process.env.NODE_ENV !== 'production') return;
  const configured = String(process.env.DATA_DIR || '').trim();
  if (!configured) {
    console.error(
      'ERROR: En producción debe existir DATA_DIR (ej. /var/data). Sin disco persistente los usuarios creados se pierden al reiniciar.'
    );
    process.exit(1);
  }
}

/** Copia seed al DATA_DIR si no existen archivos de datos (Render disco persistente). */
function bootstrapDataFiles() {
  assertProductionDataDir();

  const dataDir = getDataDir();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const seedTecnicos = path.join(SEED_DATA_DIR, 'tecnicos.xlsx');
  const targetTecnicos = path.join(dataDir, 'tecnicos.xlsx');
  const tecnicosExiste = fs.existsSync(targetTecnicos);
  console.log(`Datos: DATA_DIR=${dataDir} tecnicos.xlsx=${targetTecnicos}`);
  if (!tecnicosExiste && fs.existsSync(seedTecnicos)) {
    fs.copyFileSync(seedTecnicos, targetTecnicos);
    console.log(`Bootstrap: tecnicos.xlsx copiado desde el repositorio (el disco no tenía archivo) → ${targetTecnicos}`);
  } else if (tecnicosExiste) {
    console.log('Bootstrap: tecnicos.xlsx del disco se conserva (no se pisa con Git).');
  }

  const seedInventario = path.join(SEED_DATA_DIR, 'inventario.xlsx');
  const targetInventario = path.join(dataDir, 'inventario.xlsx');
  if (fs.existsSync(seedInventario) && path.resolve(seedInventario) !== path.resolve(targetInventario)) {
    fs.copyFileSync(seedInventario, targetInventario);
    console.log(`Bootstrap: inventario.xlsx actualizado desde el repositorio → ${targetInventario}`);
  }

  const seedVideoconferencia = path.join(SEED_DATA_DIR, 'videoconferencia.xlsx');
  const targetVideoconferencia = path.join(dataDir, 'videoconferencia.xlsx');
  if (!fs.existsSync(targetVideoconferencia) && fs.existsSync(seedVideoconferencia)) {
    fs.copyFileSync(seedVideoconferencia, targetVideoconferencia);
    console.log(`Bootstrap: videoconferencia.xlsx copiado a ${targetVideoconferencia}`);
  }

  const targetDiagnosticos = path.join(dataDir, 'diagnosticos.json');
  if (!fs.existsSync(targetDiagnosticos)) {
    const seedDiagnosticos = path.join(SEED_DATA_DIR, 'diagnosticos.json');
    if (fs.existsSync(seedDiagnosticos)) {
      fs.copyFileSync(seedDiagnosticos, targetDiagnosticos);
    } else {
      fs.writeFileSync(targetDiagnosticos, '[]', 'utf8');
    }
  }

  const targetVcLog = path.join(dataDir, 'videoconferencia-log.json');
  if (!fs.existsSync(targetVcLog)) {
    fs.writeFileSync(targetVcLog, '[]', 'utf8');
  }
}

module.exports = {
  getDataDir,
  assertProductionDataDir,
  bootstrapDataFiles,
  SEED_DATA_DIR,
};
