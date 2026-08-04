/**
 * Registra último acceso por cédula (estilo Last login de Linux).
 * Guarda el acceso anterior en sessionStorage y actualiza localStorage.
 */
export function registrarUltimoAcceso(cedula) {
  const id = String(cedula ?? '').replace(/\D/g, '');
  if (!id) return;

  const key = `ultimoAcceso_${id}`;
  const anterior = localStorage.getItem(key);

  if (anterior) {
    sessionStorage.setItem('ultimoAccesoAnterior', anterior);
  } else {
    sessionStorage.removeItem('ultimoAccesoAnterior');
  }

  localStorage.setItem(key, String(Date.now()));
}

export function formatearUltimoAcceso(timestamp) {
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
