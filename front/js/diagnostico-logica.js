/**
 * diagnostico-logica.js — Selección interactiva para los 3 campos de diagnóstico.
 * Genera texto estandarizado para el PDF (sin texto libre del técnico).
 *
 * Alcance actual: ESTÁNDAR + DESKTOP/LAPTOP.
 * TODO: agregar flujos DAAS, OBSOLESCENCIA y demás tipos de activo.
 */

/* ══════════════════════════════════════════════════════
   CONSTANTES — modificar aquí para ampliar opciones
   ══════════════════════════════════════════════════════ */

export const TIPOS_DIAGNOSTICO = [
  { value: 'ESTANDAR', label: 'ESTÁNDAR', enabled: true },
  { value: 'DAAS', label: 'DAAS', enabled: false },
  { value: 'OBSOLESCENCIA', label: 'OBSOLESCENCIA', enabled: false },
];

export const TIPOS_ACTIVO = [
  { value: 'DESKTOP', label: 'DESKTOP', enabled: true },
  { value: 'LAPTOP', label: 'LAPTOP', enabled: true },
  // TODO: habilitar cuando se implementen otros activos
  { value: 'SUREPOS', label: 'SUREPOS', enabled: false },
  { value: 'LECTOR', label: 'LECTOR', enabled: false },
  { value: 'IMPRESORA_LASER', label: 'IMPRESORA LASER', enabled: false },
  { value: 'IMPRESORA_POS', label: 'IMPRESORA POS', enabled: false },
  { value: 'ESCANER_BALANZA', label: 'ESCANER BALANZA', enabled: false },
  { value: 'ESCANER', label: 'ESCANER', enabled: false },
  { value: 'TABLET', label: 'TABLET', enabled: false },
  { value: 'VERIFICADOR_PRECIOS', label: 'VERIFICADOR PRECIOS', enabled: false },
];

export const FALLAS_HARDWARE = [
  'NO ENCIENDE',
  'PANTALLA/NO DA IMAGEN',
  'CPU',
  'BOARD',
  'RAM',
  'ALMACENAMIENTO HDD/SSD',
  'TECLADO',
  'MOUSE',
  'DIADEMA',
  'MULTIPUERTOS',
  'ADAPTADOR DISPLAY PORT',
  'CARGADOR DE ENERGIA',
  'CABLE USB',
  'RECALENTAMIENTO EXCESIVO',
  'GENERA RUIDO ANORMAL',
];

export const FALLAS_SOFTWARE = [
  'LENTITUD EN PROCESOS',
  'ERROR SISTEMA OPERATIVO',
  'BLOQUEO DE EQUIPO',
  'PANTALLAZO AZUL',
  'NO INICIA WINDOWS',
];

export const ACCIONES_REALIZADAS = [
  'Mantenimiento preventivo',
  'Cambio componentes',
  'Formateo/reinstalación del sistema operativo',
  'Reseteo de memoria CMOS',
  'Restablecer la BIOS',
  'Elimina caché',
  'Se borran procesos de arranque',
];

export const CAMBIO_PARTES = [
  'RAM',
  'SSD',
  'Teclado',
  'Mouse',
  'Pila',
  'Cargador de energía',
  'Cable USB',
  'Adaptador',
  'Fuente de poder',
  'Cooler',
  'Fan CPU',
  'Repuesto de backup',
  'NINGUNA',
];

export const REPUESTOS_AVERIADOS = [
  'RAM',
  'SSD',
  'Teclado',
  'Mouse',
  'Pila',
  'Cargador de energía',
  'Cable USB',
  'Adaptador',
  'Fuente de poder',
  'Cooler',
  'Fan CPU',
  'Board/Tarjeta Principal',
];

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */

/** Une items con coma y "y" antes del último: ["A","B","C"] → "A, B y C" */
export function unirLista(items) {
  const lista = items.filter(Boolean);
  if (lista.length === 0) return '';
  if (lista.length === 1) return lista[0];
  if (lista.length === 2) return `${lista[0]} y ${lista[1]}`;
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

function renderSelectOptions(items, { valueKey = 'value', labelKey = 'label', enabledKey = 'enabled' } = {}) {
  if (typeof items[0] === 'string') {
    return items.map(v => `<option value="${v}">${v}</option>`).join('');
  }
  return items.map(item => {
    const val = item[valueKey];
    const label = item[labelKey];
    const enabled = item[enabledKey] !== false;
    return `<option value="${val}" ${enabled ? '' : 'disabled'}>${label}</option>`;
  }).join('');
}

function renderCheckboxes(name, items, prefix) {
  return items.map((label, i) => `
    <label class="diagnostico-check">
      <input type="checkbox" name="${name}" value="${label}" id="${prefix}-${i}">
      <span>${label}</span>
    </label>
  `).join('');
}

function renderRadioGroup(name, options, prefix) {
  return options.map((opt, i) => `
    <label class="diagnostico-radio">
      <input type="radio" name="${name}" value="${opt.value}" id="${prefix}-${i}">
      <span>${opt.label}</span>
    </label>
  `).join('');
}

function getCheckedLabels(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function setPasoEnabled(el, enabled) {
  if (!el) return;
  el.classList.toggle('diagnostico-paso--deshabilitado', !enabled);
}

function syncHidden(id, text) {
  const hidden = document.getElementById(id);
  if (hidden) hidden.value = text;
}

function setPreview(id, text) {
  const preview = document.getElementById(id);
  if (preview) preview.textContent = text;
}

/* ══════════════════════════════════════════════════════
   CONSTRUCCIÓN DE TEXTOS
   ══════════════════════════════════════════════════════ */

export function construirDescripcionFalla() {
  const tipoDiag = document.getElementById('diag-tipo')?.value;
  const tipoActivo = document.getElementById('diag-activo')?.value;
  const tipoFalla = getRadioValue('diag-tipo-falla');
  const detalleHw = document.getElementById('diag-falla-hardware')?.value;
  const detalleSw = document.getElementById('diag-falla-software')?.value;

  if (tipoDiag !== 'ESTANDAR') return '';
  if (!['DESKTOP', 'LAPTOP'].includes(tipoActivo)) return '';

  let detalle = '';
  if (tipoFalla === 'HARDWARE') detalle = detalleHw;
  if (tipoFalla === 'SOFTWARE') detalle = detalleSw;
  if (!detalle) return '';

  return `Equipo presenta falla de ${detalle}.`;
}

export function construirAccionesRealizadas() {
  const acciones = getCheckedLabels('diag-acciones');
  const partesChecked = getCheckedLabels('diag-partes');
  const ninguna = partesChecked.includes('NINGUNA');
  const partes = partesChecked.filter(p => p !== 'NINGUNA');
  const solucionado = getRadioValue('diag-solucionado-acciones');

  if (acciones.length === 0 || (partes.length === 0 && !ninguna) || !solucionado) return '';

  const listaAcciones = unirLista(acciones);
  const listaPartes = ninguna ? 'NINGUNA' : unirLista(partes);

  if (solucionado === 'si') {
    return `Se procede con la revisión general del equipo, se realiza ${listaAcciones} y se realizó pruebas con cambio de partes ${listaPartes}, dando solución a la falla reportada.`;
  }

  return `Se procede con la revisión general del equipo, se realiza ${listaAcciones} sin dar solución a la falla reportada. Se realizó pruebas con cambio de partes ${listaPartes} y la falla persiste.`;
}

export function construirDiagnosticoFinal() {
  const o1 = getRadioValue('diag-final-solucionado');
  const o2 = getRadioValue('diag-final-cotizacion');
  const o5 = getRadioValue('diag-final-renovacion');
  const o4 = document.getElementById('diag-final-repuesto')?.value || '';

  if (!o1 || !o2 || !o5) return '';

  // Combinación A
  if (o1 === 'si' && o2 === 'no' && o5 === 'no') {
    if (!o4) return '';
    return `El daño es ${o4}. Se debe cambiar la parte.`;
  }

  // Combinación B
  if (o1 === 'no' && o2 === 'si' && o5 === 'no') {
    return 'El daño es la board/tarjeta principal. Se debe cambiar la parte, se escala caso al Almacén de Activos para cotizar valor de repuestos.';
  }

  // Combinación C
  if (o1 === 'no' && o2 === 'no' && o5 === 'si') {
    return 'El daño es la board/tarjeta principal. De acuerdo a la cotización enviada por el taller autorizado, el costo de la reparación es más elevado que el costo neto actual del activo, por lo que no resulta viable efectuar la reparación. Se debe realizar renovación del activo.';
  }

  return '';
}

export function getValoresDiagnostico() {
  return {
    descripcionFalla: document.getElementById('descripcion-falla')?.value.trim() || '',
    accionesRealizadas: document.getElementById('acciones-realizadas')?.value.trim() || '',
    diagnosticoFinal: document.getElementById('diagnostico-final')?.value.trim() || '',
  };
}

export function validarDiagnosticoInteractivo() {
  const { descripcionFalla, accionesRealizadas } = getValoresDiagnostico();

  if (!descripcionFalla || !accionesRealizadas) {
    return {
      valido: false,
      mensaje: 'Complete todos los campos de diagnóstico.',
    };
  }

  return { valido: true, mensaje: '' };
}

/* ══════════════════════════════════════════════════════
   ACTUALIZACIÓN EN TIEMPO REAL
   ══════════════════════════════════════════════════════ */

function actualizarDescripcionFalla() {
  const texto = construirDescripcionFalla();
  setPreview('preview-descripcion-falla', texto);
  syncHidden('descripcion-falla', texto);
}

function actualizarAccionesRealizadas() {
  const texto = construirAccionesRealizadas();
  setPreview('preview-acciones-realizadas', texto);
  syncHidden('acciones-realizadas', texto);
}

function actualizarDiagnosticoFinal() {
  const texto = construirDiagnosticoFinal();
  setPreview('preview-diagnostico-final', texto);
  syncHidden('diagnostico-final', texto);
}

function actualizarCascadaCampo1() {
  const tipoDiag = document.getElementById('diag-tipo')?.value;
  const paso2 = document.getElementById('diag-paso-activo');
  const paso3 = document.getElementById('diag-paso-tipo-falla');
  const paso4 = document.getElementById('diag-paso-detalle-falla');

  const activoOk = tipoDiag === 'ESTANDAR';
  setPasoEnabled(paso2, activoOk);

  const tipoActivo = document.getElementById('diag-activo')?.value;
  const activoSeleccionado = activoOk && ['DESKTOP', 'LAPTOP'].includes(tipoActivo);
  setPasoEnabled(paso3, activoSeleccionado);

  const tipoFalla = getRadioValue('diag-tipo-falla');
  setPasoEnabled(paso4, activoSeleccionado && !!tipoFalla);

  const panelHw = document.getElementById('diag-panel-hardware');
  const panelSw = document.getElementById('diag-panel-software');
  if (panelHw && panelSw) {
    panelHw.style.display = tipoFalla === 'HARDWARE' ? '' : 'none';
    panelSw.style.display = tipoFalla === 'SOFTWARE' ? '' : 'none';
  }

  actualizarDescripcionFalla();
}

function actualizarTodo() {
  actualizarCascadaCampo1();
  actualizarAccionesRealizadas();
  actualizarDiagnosticoFinal();
}

export function resetDiagnosticoInteractivo() {
  const form = document.getElementById('form-diagnostico');
  if (!form) return;

  form.querySelectorAll('#diag-bloque-descripcion select').forEach(el => { el.selectedIndex = 0; });
  form.querySelectorAll('#diag-bloque-descripcion input[type="radio"]').forEach(el => { el.checked = false; });
  form.querySelectorAll('#diag-bloque-acciones input').forEach(el => { el.checked = false; });
  form.querySelectorAll('#diag-bloque-final input[type="radio"]').forEach(el => { el.checked = false; });
  const repuesto = document.getElementById('diag-final-repuesto');
  if (repuesto) repuesto.selectedIndex = 0;

  actualizarTodo();
}

/* ══════════════════════════════════════════════════════
   HTML DEL FORMULARIO INTERACTIVO
   ══════════════════════════════════════════════════════ */

export function renderDiagnosticoInteractivo() {
  const optsDiag = `<option value="">— Selecciona —</option>${renderSelectOptions(TIPOS_DIAGNOSTICO)}`;
  const optsActivo = `<option value="">— Selecciona —</option>${renderSelectOptions(TIPOS_ACTIVO)}`;
  const optsHw = `<option value="">— Selecciona —</option>${renderSelectOptions(FALLAS_HARDWARE)}`;
  const optsSw = `<option value="">— Selecciona —</option>${renderSelectOptions(FALLAS_SOFTWARE)}`;
  const optsRepuesto = `<option value="">— Selecciona —</option>${renderSelectOptions(REPUESTOS_AVERIADOS)}`;

  const siNo = [
    { value: 'si', label: 'SÍ' },
    { value: 'no', label: 'NO' },
  ];

  return `
    <input type="hidden" id="descripcion-falla" name="descripcionFalla" value="">
    <input type="hidden" id="acciones-realizadas" name="accionesRealizadas" value="">
    <input type="hidden" id="diagnostico-final" name="diagnosticoFinal" value="">

    <!-- ── CAMPO 1: Descripción de la falla ── -->
    <div class="diagnostico-bloque" id="diag-bloque-descripcion">
      <div class="campo">
        <label for="diag-tipo">Descripción de la falla *</label>
        <span class="diagnostico-paso-label">Paso 1 — Tipo de diagnóstico</span>
        <select id="diag-tipo" class="diag-control">
          ${optsDiag}
        </select>
      </div>

      <div class="diagnostico-paso diagnostico-paso--deshabilitado" id="diag-paso-activo">
        <span class="diagnostico-paso-label">Paso 2 — Tipo de activo</span>
        <select id="diag-activo" class="diag-control">
          ${optsActivo}
        </select>
      </div>

      <div class="diagnostico-paso diagnostico-paso--deshabilitado" id="diag-paso-tipo-falla">
        <span class="diagnostico-paso-label">Paso 3 — Tipo de falla</span>
        <div class="diagnostico-radio-group">
          ${renderRadioGroup('diag-tipo-falla', [
            { value: 'HARDWARE', label: 'HARDWARE' },
            { value: 'SOFTWARE', label: 'SOFTWARE' },
          ], 'diag-tf')}
        </div>
      </div>

      <div class="diagnostico-paso diagnostico-paso--deshabilitado" id="diag-paso-detalle-falla">
        <div id="diag-panel-hardware">
          <span class="diagnostico-paso-label">Paso 4 — Detalle de falla (Hardware)</span>
          <select id="diag-falla-hardware" class="diag-control">
            ${optsHw}
          </select>
        </div>
        <div id="diag-panel-software" style="display:none;">
          <span class="diagnostico-paso-label">Paso 4 — Detalle de falla (Software)</span>
          <select id="diag-falla-software" class="diag-control">
            ${optsSw}
          </select>
        </div>
      </div>

      <div class="diagnostico-preview-wrap">
        <span class="diagnostico-preview__label">Vista previa — texto que aparecerá en el PDF</span>
        <div class="diagnostico-preview" id="preview-descripcion-falla" aria-live="polite"></div>
      </div>
    </div>

    <!-- ── CAMPO 2: Acciones realizadas ── -->
    <div class="diagnostico-bloque" id="diag-bloque-acciones">
      <div class="campo">
        <label>Acciones realizadas *</label>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">Acciones realizadas para resolver la falla</span>
          <div class="diagnostico-check-group diagnostico-check-group--2col">
            ${renderCheckboxes('diag-acciones', ACCIONES_REALIZADAS, 'diag-acc')}
          </div>
        </div>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">Especifique si realizó cambio de partes</span>
          <div class="diagnostico-check-group diagnostico-check-group--3col">
            ${renderCheckboxes('diag-partes', CAMBIO_PARTES, 'diag-part')}
          </div>
        </div>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">¿Se solucionó la falla?</span>
          <div class="diagnostico-radio-group">
            ${renderRadioGroup('diag-solucionado-acciones', siNo, 'diag-sol-acc')}
          </div>
        </div>
      </div>
      <div class="diagnostico-preview-wrap">
        <span class="diagnostico-preview__label">Vista previa — texto que aparecerá en el PDF</span>
        <div class="diagnostico-preview" id="preview-acciones-realizadas" aria-live="polite"></div>
      </div>
    </div>

    <!-- ── CAMPO 3: Diagnóstico final ── -->
    <div class="diagnostico-bloque" id="diag-bloque-final">
      <div class="campo">
        <label>Diagnóstico final</label>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">¿Se solucionó la falla?</span>
          <div class="diagnostico-radio-group">
            ${renderRadioGroup('diag-final-solucionado', siNo, 'diag-fs')}
          </div>
        </div>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">¿Se requiere gestionar cotización con gestor de garantías?</span>
          <div class="diagnostico-radio-group">
            ${renderRadioGroup('diag-final-cotizacion', siNo, 'diag-fc')}
          </div>
        </div>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">¿El activo tiene costo neto?</span>
          <div class="diagnostico-radio-group">
            ${renderRadioGroup('diag-final-costo', siNo, 'diag-fcost')}
          </div>
        </div>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">Indique el repuesto averiado</span>
          <select id="diag-final-repuesto" class="diag-control">
            ${optsRepuesto}
          </select>
        </div>
        <div class="diagnostico-subseccion">
          <span class="diagnostico-paso-label">¿El diagnóstico es renovación? El valor de los repuestos es más elevado que el costo neto del activo</span>
          <div class="diagnostico-radio-group">
            ${renderRadioGroup('diag-final-renovacion', siNo, 'diag-fr')}
          </div>
        </div>
      </div>
      <div class="diagnostico-preview-wrap">
        <span class="diagnostico-preview__label">Vista previa — texto que aparecerá en el PDF</span>
        <div class="diagnostico-preview" id="preview-diagnostico-final" aria-live="polite"></div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════
   INICIALIZACIÓN DE EVENTOS
   ══════════════════════════════════════════════════════ */

export function initDiagnosticoInteractivo() {
  const form = document.getElementById('form-diagnostico');
  if (!form) return;

  const campo1Ids = ['diag-tipo', 'diag-activo', 'diag-falla-hardware', 'diag-falla-software'];
  campo1Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', actualizarCascadaCampo1);
  });

  form.querySelectorAll('input[name="diag-tipo-falla"]').forEach(el => {
    el.addEventListener('change', actualizarCascadaCampo1);
  });

  form.querySelectorAll('input[name="diag-acciones"]').forEach(el => {
    el.addEventListener('change', actualizarAccionesRealizadas);
  });

  form.querySelectorAll('input[name="diag-partes"]').forEach(el => {
    el.addEventListener('change', (e) => {
      const target = e.target;
      if (target.value === 'NINGUNA' && target.checked) {
        form.querySelectorAll('input[name="diag-partes"]:not([value="NINGUNA"])').forEach(cb => {
          cb.checked = false;
        });
      } else if (target.value !== 'NINGUNA' && target.checked) {
        const ninguna = form.querySelector('input[name="diag-partes"][value="NINGUNA"]');
        if (ninguna) ninguna.checked = false;
      }
      actualizarAccionesRealizadas();
    });
  });

  form.querySelectorAll('input[name="diag-solucionado-acciones"]').forEach(el => {
    el.addEventListener('change', actualizarAccionesRealizadas);
  });

  form.querySelectorAll(
    'input[name="diag-final-solucionado"], input[name="diag-final-cotizacion"], input[name="diag-final-renovacion"]'
  ).forEach(el => {
    el.addEventListener('change', actualizarDiagnosticoFinal);
  });

  const repuesto = document.getElementById('diag-final-repuesto');
  if (repuesto) repuesto.addEventListener('change', actualizarDiagnosticoFinal);

  actualizarTodo();
}
