const fs = require('fs');
const path = require('path');

const SEED_DATA_DIR = path.join(__dirname, '../data');

function getDataDir() {
  return process.env.DATA_DIR || SEED_DATA_DIR;
}

/** Copia seed al DATA_DIR si no existen archivos de datos (Render disco persistente). */
function bootstrapDataFiles() {
  const dataDir = getDataDir();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const seedTecnicos = path.join(SEED_DATA_DIR, 'tecnicos.xlsx');
  const targetTecnicos = path.join(dataDir, 'tecnicos.xlsx');
  if (!fs.existsSync(targetTecnicos) && fs.existsSync(seedTecnicos)) {
    fs.copyFileSync(seedTecnicos, targetTecnicos);
    console.log(`Bootstrap: tecnicos.xlsx copiado a ${targetTecnicos}`);
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
}

module.exports = {
  getDataDir,
  bootstrapDataFiles,
  SEED_DATA_DIR,
};
