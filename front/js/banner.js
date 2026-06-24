/**
 * banner.js — Componente banner reutilizable
 * Se importa en index.js y usuario.js para inyectar el banner en #banner.
 */
export function renderBanner() {
  const banner = document.getElementById('banner');
  if (!banner) return;

  const logoCount = 5;
  const logosHTML = Array.from({ length: logoCount }, (_, i) => {
    const n = i + 1;
    return `
      <img
        src="/assets/logo${n}.png"
        alt="Logo ${n}"
        class="banner__logo"
        onerror="this.replaceWith(crearPlaceholder(${n}))"
      >`;
  }).join('');

  banner.innerHTML = `<div class="banner__logos">${logosHTML}</div>`;

  // Exponer helper para el onerror inline
  window.crearPlaceholder = (n) => {
    const div = document.createElement('div');
    div.className = 'banner__logo-placeholder';
    div.textContent = `Logo ${n}`;
    return div;
  };
}
