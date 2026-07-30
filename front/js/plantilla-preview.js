/**
 * plantilla-preview.js — Vista previa del formato PDF con datos de ejemplo.
 * No lee ni modifica el formulario de diagnóstico.
 */

/** Datos fijos para previsualizar la plantilla (ejemplo PDA CK65) */
export const DATOS_MUESTRA = {
  sede:              'Alkosto Villavicencio',
  fecha:             '12/05/2026',
  nombreUsuario:     'Hugo Felipe Torres',
  areaUsuario:       'Bodega',
  cedula:            '17.340.222',
  ubicacionFisica:   'AKVIL',
  marca:             'HONEYWELL',
  serial:            '22164D81A5',
  modelo:            'CK65',
  etiqueta:          '0045605',
  procesador:        'No Aplica',
  versionSO:         'No Aplica',
  ram:               'No Aplica',
  nombreEquipo:      'No Aplica',
  sistemaOperativo:  'No Aplica',
  versionOffice:     'No Aplica',
  hd:                'No Aplica',
  appsMayorUso:      'No Aplica',
  appsFueraEstandar: 'No Aplica',
  descripcionFalla:
    'PDA en momentos se apaga mientras se usa.',
  accionesRealizadas:
    'Se procede con la revisión general del equipo, se realiza Mantenimiento preventivo y se realizó pruebas con cambio de partes NINGUNA, dando solución a la falla reportada.',
  diagnosticoFinal:
    'Se recomienda enviar el equipo a servicio técnico autorizado para revisión de placa principal.',
  nombreTecnico:     'Técnico de Ejemplo',
  cedulaTecnico:     '1.234.567.890',
  cargoTecnico:      'Soporte en Sitio',
  firmaBase64:       '',
  testFabricanteRealizado: '',
  testFabricanteVersion:   '',
  testFabricanteResultado: '',
  intercambioPartes:       '',
  razonSolicitud:          '',
};

export async function fetchTemplate() {
  const res = await fetch('/api/template');
  if (!res.ok) throw new Error('No se pudo cargar la plantilla');
  return res.text();
}

export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function reemplazarPlaceholders(html, valores) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, clave) => {
    const val = valores[clave];
    if (val === undefined || val === null) return '';

    if (clave === 'firmaBase64') {
      return val
        ? `<img src="${val}" alt="Firma">`
        : '';
    }

    return escHtml(String(val));
  });
}

export function parseTemplateHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const styles = [...doc.querySelectorAll('style')]
    .map(s => s.textContent)
    .join('\n');
  return { styles, bodyHTML: doc.body.innerHTML };
}

function esperarImagenes(container) {
  const imgs = [...container.querySelectorAll('img')];
  return Promise.all(
    imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

function scopeStylesForPreview(styles) {
  return styles
    .replace(/\bbody\s*\{/g, '.plantilla-preview-doc {')
    .replace(/overflow:\s*hidden/g, 'overflow: visible');
}

/** Renderiza la plantilla rellena dentro de un contenedor DOM */
export async function renderPlantillaEnContenedor(container, valores = DATOS_MUESTRA) {
  const templateHTML = await fetchTemplate();
  const htmlRelleno = reemplazarPlaceholders(templateHTML, valores);
  const { styles, bodyHTML } = parseTemplateHTML(htmlRelleno);
  const scopedStyles = scopeStylesForPreview(styles);
  container.innerHTML =
    `<style>${scopedStyles}</style>` +
    `<div class="plantilla-preview-doc">${bodyHTML}</div>`;
  await esperarImagenes(container);
}
