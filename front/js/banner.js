/**
 * banner.js — Componente banner reutilizable
 * Se importa en index.js y usuario.js para inyectar el banner en #banner.
 * Logos del header: front/assets/header/ (separados de los del PDF en front/assets/pdf/).
 */

const BANNER_LOGOS = [
  { src: '/assets/header/alkosto.jpg', alt: 'Alkosto' },
  { src: '/assets/header/ktronix.jpg', alt: 'K-Tronix' },
  { src: '/assets/header/corbeta-color.jpg', alt: 'Corbeta' },
  { src: '/assets/header/alkomprar.png', alt: 'Alkomprar' },
  { src: '/assets/header/akt.png', alt: 'AKT' },
  { src: '/assets/header/corbeta-azul.png', alt: 'Corbeta' },
];

export function renderBanner() {
  const banner = document.getElementById('banner');
  if (!banner) return;

  window.crearPlaceholder = (label) => {
    const div = document.createElement('div');
    div.className = 'banner__logo-placeholder';
    div.textContent = label;
    return div;
  };

  const logosHTML = BANNER_LOGOS.map((logo) => {
    const label = logo.alt.replace(/'/g, "\\'");
    return `
      <img
        src="${logo.src}"
        alt="${logo.alt}"
        class="banner__logo"
        onerror="this.replaceWith(crearPlaceholder('${label}'))"
      >`;
  }).join('');

  banner.innerHTML = `<div class="banner__logos">${logosHTML}</div>`;
}
