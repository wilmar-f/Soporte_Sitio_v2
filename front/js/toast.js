/**
 * toast.js — Componente Toast/Alert reutilizable
 * Uso: toast('Mensaje aquí', 'exito' | 'error' | 'info' | 'advertencia')
 */

const ICONOS = {
  exito:       '✓',
  error:       '✕',
  info:        'ℹ',
  advertencia: '⚠',
};

const DURACION_MS = 4500;

export function toast(mensaje, tipo = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <span class="toast__icono" aria-hidden="true">${ICONOS[tipo] ?? 'ℹ'}</span>
    <span class="toast__texto">${mensaje}</span>
    <button class="toast__cerrar" aria-label="Cerrar notificación">×</button>
  `;

  container.appendChild(el);

  const cerrar = () => {
    el.classList.add('toast--saliendo');
    setTimeout(() => el.remove(), 320);
  };

  el.querySelector('.toast__cerrar').addEventListener('click', cerrar);
  setTimeout(cerrar, DURACION_MS);
}
