/**
 * Genera backend/data/tecnicos.xlsx de ejemplo.
 * Ejecutar: node scripts/init-tecnicos-xlsx.js
 * Reemplazar con el archivo real que envíe el administrador.
 */
const path = require('path');
const XLSX = require('xlsx');

const outPath = path.join(__dirname, '../data/tecnicos.xlsx');

const rows = [
  { Cédula: '12345678', Contraseña: 'abc123', Nombre: 'WILMAR FRANCO', Cargo: 'SOPORTE EN SITIO' },
];

const sheet = XLSX.utils.json_to_sheet(rows);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, 'Tecnicos');
XLSX.writeFile(book, outPath);
console.log('Creado:', outPath);
