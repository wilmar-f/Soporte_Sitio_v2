/**
 * usuario.js — Lógica principal del panel de usuario
 * Incluye: verificación de sesión, carga de datos CSV, formulario dinámico,
 * autocompletado, validaciones y generación de PDF vía Puppeteer en el servidor.
 *
 * NOTA FUTURA: Si se requiere subir el PDF automáticamente a OneDrive/SharePoint,
 * se deberá implementar Microsoft Graph API con una app registrada en Azure AD.
 * Esto queda fuera del alcance actual de esta aplicación.
 */
import { renderBanner }      from './banner.js';
import { toast }             from './toast.js';
import { logoutOffice365 }   from './auth-office365.js';
import {
  renderDiagnosticoInteractivo,
  initDiagnosticoInteractivo,
  validarDiagnosticoInteractivo,
  resetDiagnosticoInteractivo,
} from './diagnostico-logica.js';
import { formatearUltimoAcceso } from './ultimo-acceso.js';
import { renderPanelNoticias, esRolAdministrador } from './noticias.js';

const MAX_EVIDENCIAS = 4;
let evidenciasAdjuntas = [];

/* ══════════════════════════════════════════════════════
   1. VERIFICACIÓN DE SESIÓN
   ══════════════════════════════════════════════════════ */
const loginType      = sessionStorage.getItem('loginType') || 'admin';
const tokenGuardado  = sessionStorage.getItem('token');
const usuarioGuardado = sessionStorage.getItem('usuario');
const o365Guardado   = sessionStorage.getItem('o365session');

const sesionValida =
  (loginType === 'admin'    && tokenGuardado  && usuarioGuardado) ||
  (loginType === 'office365' && o365Guardado);

if (!sesionValida) {
  window.location.replace('/pages/index.html');
}

// Normalizar datos del usuario para uso unificado en toda la página
let usuarioActual;
if (loginType === 'office365') {
  const o365 = JSON.parse(o365Guardado);
  usuarioActual = {
    nombreCompleto : o365.nombreCompleto,
    correo         : o365.correo,
    rol            : 'Técnico Office 365',
    fotoPerfil     : o365.fotoPerfil  || null,
    cedulaTecnico  : o365.cedulaTecnico || '',
    cargoTecnico   : o365.cargoTecnico  || null,
    loginType      : 'office365',
  };
} else {
  usuarioActual = { ...JSON.parse(usuarioGuardado), loginType: 'admin' };
}

function esAdministrador() {
  return esRolAdministrador(usuarioActual.rol);
}

function setSidebarBtnVisible(btn, visible) {
  if (!btn) return;
  btn.hidden = !visible;
  btn.style.display = visible ? '' : 'none';
}

/* ══════════════════════════════════════════════════════
   2. DATOS MAESTROS: SEDES ↔ CÓDIGOS DE UBICACIÓN
   ══════════════════════════════════════════════════════ */
const SEDES_CODIGOS = [
  { sede: 'ADMON CENTRAL ALKOSTO AV 68', codigo: 'AKB68' },
  { sede: 'ALKOMPRAR AKT 1RA MAYO #2', codigo: 'ALK2M' },
  { sede: 'ALKOMPRAR AKT LA 72', codigo: 'ALK72' },
  { sede: 'ALKOMPRAR BOGOTA CENTRO', codigo: 'ALCEN' },
  { sede: 'ALKOMPRAR MOTOS ROYALL BOGOTA', codigo: 'ALRO2' },
  { sede: 'ALKOSTO VENECIA', codigo: 'AKVEN' },
  { sede: 'ALKOSTO 170', codigo: 'AK170' },
  { sede: 'ALKOSTO AV 68', codigo: 'AKB30' },
  { sede: 'ALKOSTO CRA 30', codigo: 'AKEDE' },
  { sede: 'ALKOSTO EL EDEN', codigo: 'ALVEN' },
  { sede: 'ALKOMPRAR VENECIA', codigo: 'ALVE1' },
  { sede: 'ALKOMPRAR VENECIA ALMACEN REPUESTOS', codigo: 'AKOVE' },
  { sede: 'ALKOSTO OUTLET VENECIA', codigo: 'AKOUT' },
  { sede: 'CENTRO DE SERVICIOS COLOMBIANITA', codigo: 'CENTR' },
  { sede: 'DISTRIBUCIONES BOGOTA', codigo: 'DIBOG' },
  { sede: 'FOTON AV 68', codigo: 'FOA68' },
  { sede: 'FOTON BOYACA', codigo: 'FOBOY' },
  { sede: 'FOTON FATIMA', codigo: 'FOFAT' },
  { sede: 'FOTON FONTIBON', codigo: 'FOFON' },
  { sede: 'KALLEY', codigo: 'KALLEY' },
  { sede: 'K-TRONIX 94', codigo: 'KTB94' },
  { sede: 'K-TRONIX INTERNET', codigo: 'KTINT' },
  { sede: 'K-TRONIX SALITRE', codigo: 'KTSAL' },
  { sede: 'K-TRONIX TITAN', codigo: 'KTTIT' },
  { sede: 'K-TRONIX UNICENTRO', codigo: 'KTUNI' },
  { sede: 'MOTOS BOGOTA NUBE', codigo: 'MOBON' },
  { sede: 'NUBE AKT ÉXITO SOGAMOSO', codigo: 'RKBOG' },
  { sede: 'REPUESTOS KALLEY BOGOTA', codigo: 'VWFON' },
  { sede: 'VOLKSWAGEN FONTIBÓN', codigo: 'DIFLO' },
  { sede: 'DISTRIBUCIONES FLORENCIA', codigo: 'AKCED' },
  { sede: 'CEDI ALKOSTO', codigo: 'AKCE2' },
  { sede: 'CEDI ALKOSTO 2', codigo: 'AKCE3' },
  { sede: 'CEDI ALKOSTO 3', codigo: 'AKCE4' },
  { sede: 'CEDI ALKOSTO 4', codigo: 'CEBOG' },
  { sede: 'CEDI BOGOTA', codigo: 'MOCEB' },
  { sede: 'CEDI MOTOS FUNZA', codigo: 'KTFUS' },
  { sede: 'K-TRONIX FUSA', codigo: 'KTGIR' },
  { sede: 'K-TRONIX GIRARDOT', codigo: 'KTMOS' },
  { sede: 'K-TRONIX MOSQUERA', codigo: 'ALKAU' },
  { sede: 'ALKOMPRAR AKT BAJAJ SOACHA', codigo: 'ALSOA' },
  { sede: 'ALKOMPRAR AKT SOACHA', codigo: 'KTTUN' },
  { sede: 'K-TRONIX TUNJA', codigo: 'MOTOS' },
  { sede: 'NUBE AKT EXITO TUNJA', codigo: 'ALVIL' },
  { sede: 'ALKOMPRAR AKT VILLAVICENCIO', codigo: 'ALVI2' },
  { sede: 'ALKOMPRAR VILLAVICENCIO #2', codigo: 'AKVIL' },
  { sede: 'ALKOSTO VILLAVICENCIO', codigo: 'FOVIL' },
  { sede: 'FOTON VILLAVICENCIO', codigo: 'KTVIL' },
  { sede: 'K-TRONIX VILLAVICENCIO', codigo: 'AKYOP' },
  { sede: 'ALKOSTO YOPAL', codigo: 'AKIPI' },
  { sede: 'ALKOSTO IPIALES', codigo: 'AKIGP' },
  { sede: 'ALKOSTO IPIALES GRAN PLAZA', codigo: 'AKBOL' },
  { sede: 'ALKOSTO AV BOLIVAR', codigo: 'AKPAS' },
  { sede: 'ALKOSTO PASTO', codigo: 'DIPAS' },
  { sede: 'DISTRIBUCIONES PASTO', codigo: 'FOPAS' },
  { sede: 'FOTON PASTO', codigo: 'AKTUQ' },
  { sede: 'ALKOSTO TUQUERRES', codigo: 'ALARM' },
  { sede: 'ALKOMPRAR ARMENIA', codigo: 'ALBA3' },
  { sede: 'REPUESTOS MOTOS EJE CAFETERO', codigo: 'ALBA4' },
  { sede: 'ALKOMPRAR AKT BARRANQUILLA #3', codigo: 'ALBAR' },
  { sede: 'ALKOMPRAR AKT BARRANQUILLA #4', codigo: 'ALBA5' },
  { sede: 'ALKOMPRAR BARRANQUILLA', codigo: 'AKBAR' },
  { sede: 'ALKOMPRAR BARRANQUILLA UNICO', codigo: 'DIBAR' },
  { sede: 'ALKOSTO BARRANQUILLA', codigo: 'KTBAR' },
  { sede: 'DISTRIBUCIONES BARRANQUILLA', codigo: 'ALRUS' },
  { sede: 'K-TRONIX BARRANQUILLA', codigo: 'ALCAL' },
  { sede: 'NUBE AKT SURTIMAX MACARENA', codigo: 'ALCA4' },
  { sede: 'NUBE AKT EXITO BUENAVENTURA', codigo: 'ALRO3' },
  { sede: 'ALKOMPRAR AKT AV ROOSVELT', codigo: 'ALKUN' },
  { sede: 'ALKOMPRAR CALI', codigo: 'AKCAL' },
  { sede: 'ALKOMPRAR CALI #4', codigo: 'AKCAN' },
  { sede: 'ALKOMPRAR MOTOS ROYAL CALI', codigo: 'DICAL' },
  { sede: 'ALKOMPRAR UNICO', codigo: 'FOCAL' },
  { sede: 'ALKOSTO CALI', codigo: 'KTCAL' },
  { sede: 'ALKOSTO CALI NORTE', codigo: 'MOCAN' },
  { sede: 'CST MOTOS CALI 1', codigo: 'VWCAL' },
  { sede: 'DISTRIBUCIONES CALI', codigo: 'ALIBA' },
  { sede: 'FOTON CALI', codigo: 'KTMAN' },
  { sede: 'K-TRONIX CALI CHIPICHAPE', codigo: 'ALMO1' },
  { sede: 'NUBE AKT ÉXITO SAN FERNANDO CALI', codigo: 'ALNUE' },
  { sede: 'VOLKSWAGEN CALI', codigo: 'DIMON' },
  { sede: 'ALKOMPRAR IBAGUE', codigo: 'ALNEI' },
  { sede: 'K-TRONIX MANIZALES', codigo: 'ALPER' },
  { sede: 'ALKOMPRAR AKT MONTERIA #1', codigo: 'AKPER' },
  { sede: 'ALKOMPRAR CC NUESTRO MONTERIA', codigo: 'AKCEP' },
  { sede: 'DISTRIBUCIONES MONTERIA', codigo: 'ALSIN' },
  { sede: 'NUBE AKT EXITO MONTERIA', codigo: 'AKSIN' },
  { sede: 'ALKOMPRAR NEIVA', codigo: 'ALVAL' },
  { sede: 'ALKOMPRAR DOSQUEBRADAS PEREIRA', codigo: 'ALVA2' },
  { sede: 'ALKOSTO PEREIRA', codigo: 'ALAPA' },
  { sede: 'CENTRO DISTRIBUCIÓN PEREIRA AKCEP', codigo: 'DIAPA' },
  { sede: 'NUBE AKT EXITO SABANALARGA', codigo: 'ALBAC' },
  { sede: 'ALKOMPRAR SINCELEJO', codigo: 'ALBEL' },
  { sede: 'ALKOSTO SINCELEJO', codigo: 'ALBE2' },
  { sede: 'ALKOMPRAR VALLEDUPAR', codigo: 'ALNI5' },
  { sede: 'ALKOMPRAR VALLEDUPAR #2', codigo: 'ALBUK' },
  { sede: 'ALKOMPRAR APARTADO', codigo: 'ALBN2' },
  { sede: 'DISTRIBUCIONES APARTADO', codigo: 'ALBN3' },
  { sede: 'ALKOMPRAR BARRANCABERMEJA', codigo: 'ALBUC' },
  { sede: 'NUBE AKT EXITO BARRANCABERMEJA', codigo: 'ALBU2' },
  { sede: 'NUBE AKT VICTOR MOTOS BARRANCABERMEJA', codigo: 'KTBUC' },
  { sede: 'ALKOMPRAR BELLO', codigo: 'DIMED' },
  { sede: 'ALKOMPRAR BELLO #2', codigo: 'FOCOP' },
  { sede: 'ALKOMPRAR NIHLO NO 5', codigo: 'ALCUC' },
  { sede: 'ALKOMPRAR AKT BUCARAMANGA', codigo: 'AKFLO' },
  { sede: 'ALKOMPRAR AKT BUCARAMANGA #2', codigo: 'AKGIR' },
  { sede: 'ALKOMPRAR AKT BUCARAMANGA #3', codigo: 'FOITA' },
  { sede: 'ALKOMPRAR BUCARAMANGA', codigo: 'VWITA' },
  { sede: 'ALKOMPRAR BUCARAMANGA #2', codigo: 'TEDAF' },
  { sede: 'K-TRONIX BUCARAMANGA', codigo: 'ALCED' },
  { sede: 'NUBE AKT EXITO CENTRO BUCARAMANGA', codigo: 'AL332' },
  { sede: 'CENTRO LOGISTICO ENTRADA NORTE', codigo: 'AL333' },
  { sede: 'FOTON COPACABANA', codigo: 'ALAVE' },
  { sede: 'ALKOMPRAR CUCUTA', codigo: 'ALK33' },
  { sede: 'NUBE AKT EXITO AVENIDA QUINTA CUCUTA', codigo: 'ALFLO' },
  { sede: 'ALKOSTO FLORIDABLANCA', codigo: 'ALKA1' },
  { sede: 'CEDI ALKOSTO GIRON', codigo: 'ALBAS' },
  { sede: 'FOTON ITAGUI', codigo: 'ALMAY' },
  { sede: 'VOLKSWAGEN ITAGUI', codigo: 'ALMOL' },
  { sede: 'TEXTILES DAFITI', codigo: 'ALRO1' },
  { sede: 'ADMON CENTRAL ALKOMPRAR', codigo: 'ALNI1' },
  { sede: 'ALKOMPRAR AKT LA 33 #2', codigo: 'ALNIB' },
  { sede: 'ALKOMPRAR AKT LA 33 #3', codigo: 'ALNI2' },
  { sede: 'ALKOMPRAR AVENTURA', codigo: 'ALPRO' },
  { sede: 'ALKOMPRAR DE LA 33', codigo: 'ALDIE' },
  { sede: 'ALKOMPRAR FLORIDA', codigo: 'ALSAN' },
  { sede: 'ALKOMPRAR KALLEY MEDELLIN', codigo: 'CPPAL' },
  { sede: 'ALKOMPRAR LA BASTILLA', codigo: 'DISMD' },
  { sede: 'ALKOMPRAR MAYORCA', codigo: 'MFORD' },
  { sede: 'ALKOMPRAR MOLINOS', codigo: 'FOMED' },
  { sede: 'ALKOMPRAR MOTOS ROYAL MEDELLIN', codigo: 'KALEY' },
  { sede: 'ALKOMPRAR NIHLO', codigo: 'KTARK' },
  { sede: 'ALKOMPRAR NIHLO BODEGA', codigo: 'KTTES' },
  { sede: 'ALKOMPRAR NIHLO NO 2', codigo: 'KTPOB' },
  { sede: 'ALKOMPRAR PROYECTOS', codigo: 'MOMEN' },
  { sede: 'ALKOMPRAR SAN DIEGO', codigo: 'REPME' },
  { sede: 'ALKOMPRAR SAN JUAN', codigo: 'REPMD' },
  { sede: 'CASA PRINCIPAL', codigo: 'TEXTI' },
  { sede: 'DISTRIBUCIONES MEDELLÍN', codigo: 'TXTIL' },
  { sede: 'DISTRIBUCIONES OUTLET MEDELLÍN', codigo: 'TEMEV' },
  { sede: 'ENSAMBLADORA DE MOTOS', codigo: 'TEMEC' },
  { sede: 'FORD MEDELLIN', codigo: 'TERIO' },
  { sede: 'FOTON MEDELLIN', codigo: 'VWMED' },
  { sede: 'KALLEY(DIMED)', codigo: 'ALPIE' },
  { sede: 'K-TRONIX ARKADIA', codigo: 'ALPOL' },
  { sede: 'K-TRONIX EL TESORO', codigo: 'ALRIO' },
  { sede: 'K-TRONIX POBLADO', codigo: 'ALRIO' },
  { sede: 'NUBE AKT EXITO POBLADO', codigo: 'ALRIO' },
  { sede: 'REPUESTOS MOTOS', codigo: 'ALRIO' },
  { sede: 'REPUESTOS OUTLET MEDELLÍN', codigo: 'ALRIO' },
  { sede: 'TEXTILES', codigo: 'ALRIO' },
  { sede: 'TEXTILES GLOKAL MEDELLIN 3 VIAS', codigo: 'ALRIO' },
  { sede: 'TEXTILES GLOKAL MEDELLIN CENTRO', codigo: 'ALRIO' },
  { sede: 'TEXTILES RIONEGRO', codigo: 'ALRIO' },
  { sede: 'VOLKSWAGEN MEDELLIN', codigo: 'VWMED' },
  { sede: 'ALKOMPRAR PIEDECUESTA', codigo: 'ALPIE' },
  { sede: 'ALKOMPRAR AKT RIONEGRO LA POLA', codigo: 'ALPOL' },
  { sede: 'ALKOMPRAR RIONEGRO', codigo: 'ALRIO' },
  { sede: 'NUBE AKT VICTOR MOTOS SAN ALBERTO', codigo: 'ALRIO' },
];

/* ══════════════════════════════════════════════════════
   3. DATOS EN MEMORIA (cargados desde backend)
   ══════════════════════════════════════════════════════ */
let datosUsuarios   = [];  // [{cedula, nombreUsuario}]
let datosInventario = [];  // [{serial, etiqueta, fabricante, modelo}]

/* ══════════════════════════════════════════════════════
   4. INICIALIZACIÓN
   ══════════════════════════════════════════════════════ */
renderBanner();
renderInfoUsuario();
cargarDatosIniciales();
registrarEventosSidebar();

/* ── Renderiza datos del usuario en el sidebar ─────── */
function toTitleCase(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function obtenerCargoUsuario() {
  if (usuarioActual.loginType === 'office365') {
    return usuarioActual.cargoTecnico || usuarioActual.rol || '';
  }
  return usuarioActual.cargo || usuarioActual.rol || '';
}

function renderUltimoAccesoSidebar() {
  const el = document.getElementById('user-ultimo-acceso');
  if (!el) return;

  const anterior = sessionStorage.getItem('ultimoAccesoAnterior');
  if (!anterior) {
    el.textContent = 'Primer ingreso en este equipo';
    return;
  }

  const fmt = formatearUltimoAcceso(anterior);
  el.textContent = fmt ? `Último acceso: ${fmt}` : '';
}

function renderInfoUsuario() {
  const { nombreCompleto, correo, fotoPerfil, loginType: tipo } = usuarioActual;
  const cargo = toTitleCase(obtenerCargoUsuario());

  document.getElementById('user-nombre').textContent = nombreCompleto || '—';
  document.getElementById('user-correo').textContent = correo || usuarioActual.cedula || '—';
  document.getElementById('user-rol').textContent    = cargo || '—';
  renderUltimoAccesoSidebar();

  const avatarEl = document.getElementById('user-avatar');
  const inicial  = (nombreCompleto || 'U').charAt(0).toUpperCase();

  if (tipo === 'office365' && fotoPerfil) {
    // Mostrar foto de perfil O365 — fallback silencioso a la inicial si falla la carga
    const img = document.createElement('img');
    img.src    = fotoPerfil;
    img.alt    = 'Foto de perfil';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
    img.onerror = () => {
      avatarEl.innerHTML = '';
      avatarEl.textContent = inicial;
    };
    avatarEl.innerHTML = '';
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = inicial;
  }

  const btnNoticias = document.getElementById('btn-noticias');
  setSidebarBtnVisible(btnNoticias, esAdministrador());

  const btnCambiarContrasena = document.getElementById('btn-cambiar-contrasena');
  setSidebarBtnVisible(btnCambiarContrasena, tipo === 'admin');
}

/* ── Carga ambos CSVs al iniciar ───────────────────── */
async function cargarDatosIniciales() {
  try {
    const [resUsuarios, resInventario] = await Promise.all([
      fetch('/api/usuarios',   { headers: { Authorization: `Bearer ${tokenGuardado}` } }),
      fetch('/api/inventario', { headers: { Authorization: `Bearer ${tokenGuardado}` } }),
    ]);

    if (resUsuarios.ok)   datosUsuarios   = await resUsuarios.json();
    if (resInventario.ok) datosInventario = await resInventario.json();

    console.log(`Cargados: ${datosUsuarios.length} usuarios, ${datosInventario.length} equipos de inventario`);
  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
    toast('No se pudieron cargar algunos datos maestros. Revisa la conexión.', 'advertencia');
  }
}

/* ══════════════════════════════════════════════════════
   5. EVENTOS DEL SIDEBAR
   ══════════════════════════════════════════════════════ */
function registrarEventosSidebar() {
  document.getElementById('btn-diagnostico').addEventListener('click', () => {
    activarBotonSidebar('btn-diagnostico');
    renderFormularioDiagnostico();
  });

  const btnNoticias = document.getElementById('btn-noticias');
  if (btnNoticias && esAdministrador()) {
    btnNoticias.addEventListener('click', () => {
      activarBotonSidebar('btn-noticias');
      renderPanelNoticias(tokenGuardado);
    });
  }

  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);

  registrarModalCambiarContrasena();
}

function abrirModalCambiarContrasena() {
  const modal = document.getElementById('modal-cambiar-contrasena');
  const form = document.getElementById('form-cambiar-contrasena');
  if (!modal || !form) return;
  form.reset();
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('clave-actual')?.focus();
}

function cerrarModalCambiarContrasena() {
  const modal = document.getElementById('modal-cambiar-contrasena');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('form-cambiar-contrasena')?.reset();
}

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_COMPLEXITY_MSG =
  'La nueva contraseña debe tener al menos 6 caracteres, una letra mayúscula, un número y un carácter especial (. * + -).';

function validarComplejidadContrasena(contrasena) {
  const pwd = String(contrasena);
  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: PASSWORD_COMPLEXITY_MSG };
  }
  const valid =
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[.*+\-]/.test(pwd);
  return valid ? { ok: true } : { ok: false, error: PASSWORD_COMPLEXITY_MSG };
}

function registrarModalCambiarContrasena() {
  const btnAbrir = document.getElementById('btn-cambiar-contrasena');
  const btnCancelar = document.getElementById('btn-clave-cancelar');
  const backdrop = document.getElementById('modal-clave-backdrop');
  const form = document.getElementById('form-cambiar-contrasena');

  if (usuarioActual.loginType !== 'admin') return;

  btnAbrir?.addEventListener('click', abrirModalCambiarContrasena);
  btnCancelar?.addEventListener('click', cerrarModalCambiarContrasena);
  backdrop?.addEventListener('click', cerrarModalCambiarContrasena);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!tokenGuardado) {
      toast('Sesión expirada. Vuelve a ingresar.', 'error');
      return;
    }

    const contrasenaActual = document.getElementById('clave-actual')?.value || '';
    const contrasenaNueva = document.getElementById('clave-nueva')?.value || '';
    const contrasenaConfirmacion = document.getElementById('clave-confirmar')?.value || '';

    if (contrasenaNueva !== contrasenaConfirmacion) {
      toast('La nueva contraseña y la confirmación no coinciden.', 'advertencia');
      return;
    }

    const complejidad = validarComplejidadContrasena(contrasenaNueva);
    if (!complejidad.ok) {
      toast(complejidad.error, 'advertencia');
      return;
    }

    const btnGuardar = document.getElementById('btn-clave-guardar');
    if (btnGuardar) {
      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando…';
    }

    try {
      const res = await fetch('/api/cambiar-contrasena', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenGuardado}`,
        },
        body: JSON.stringify({ contrasenaActual, contrasenaNueva, contrasenaConfirmacion }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast(data.error || 'No se pudo cambiar la contraseña.', 'error');
        return;
      }

      toast(data.mensaje || 'Contraseña actualizada correctamente.', 'exito');
      cerrarModalCambiarContrasena();
    } catch (err) {
      console.error('Error cambiando contraseña:', err);
      toast('Error de conexión al cambiar la contraseña.', 'error');
    } finally {
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
      }
    }
  });
}

function activarBotonSidebar(idActivo) {
  document.querySelectorAll('.sidebar__btn:not(.sidebar__btn--peligro):not(.sidebar__btn--secundario)').forEach(btn => {
    btn.classList.toggle('sidebar__btn--activo', btn.id === idActivo);
  });
}

function cerrarSesion() {
  if (usuarioActual.loginType === 'office365') {
    logoutOffice365();
    sessionStorage.removeItem('o365session');
  }
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('usuario');
  sessionStorage.removeItem('loginType');
  toast('Su sesión ha sido cerrada con éxito.', 'exito');
  setTimeout(() => window.location.replace('/pages/index.html'), 1400);
}

/* ══════════════════════════════════════════════════════
   6. FUNCIONES DE BÚSQUEDA / AUTOCOMPLETADO
   ══════════════════════════════════════════════════════ */

/** Busca nombre de usuario por cédula (comparación exacta como string) */
function buscarPorCedula(cedula) {
  const limpio = String(cedula).trim();
  const encontrado = datosUsuarios.find(u => String(u.cedula).trim() === limpio);
  return encontrado ? encontrado.nombreUsuario : null;
}

/** Busca equipo por serial (comparación case-insensitive). Retorna objeto o null. */
function buscarEquipoPorSerial(serial) {
  const limpio = serial.trim().toLowerCase();
  const encontrado = datosInventario.find(
    e => String(e.serial).trim().toLowerCase() === limpio
  );
  return encontrado || null;
}

/** Marca inputs de equipo como solo lectura (autocompletados por serial). */
function bloquearCamposEquipo() {
  ['marca', 'modelo', 'etiqueta'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.readOnly = true;
    el.style.background = 'var(--color-gris-fondo, #f0f4ff)';
    el.style.cursor = 'default';
  });
}

/** Limpia Marca, Modelo y Etiqueta tras cambio o serial no encontrado. */
function limpiarCamposEquipo() {
  ['marca', 'modelo', 'etiqueta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/**
 * Autocompleta Marca, Modelo y Etiqueta según serial.
 * Marca y Modelo se normalizan a MAYÚSCULAS.
 * @returns {boolean} true si el serial existe en inventario
 */
function autocompletarEquipoPorSerial(serial) {
  const inputSerial = document.getElementById('serial');
  const equipo = buscarEquipoPorSerial(serial);

  if (!equipo) {
    limpiarCamposEquipo();
    if (inputSerial) marcarInvalido(inputSerial);
    toast('El serial no existe en el inventario.', 'error');
    return false;
  }

  document.getElementById('marca').value    = (equipo.fabricante || '').toUpperCase();
  document.getElementById('modelo').value   = (equipo.modelo || '').toUpperCase();
  document.getElementById('etiqueta').value = equipo.etiqueta || '';

  ['marca', 'modelo', 'etiqueta', 'serial'].forEach(id => {
    const el = document.getElementById(id);
    if (el) limpiarInvalido(el);
  });

  return true;
}

/* ══════════════════════════════════════════════════════
   7. RENDERIZADO DEL FORMULARIO DINÁMICO
   ══════════════════════════════════════════════════════ */

function renderFormularioDiagnostico() {
  const panel = document.getElementById('panel-principal');

  const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const cmpEs = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });
  const opsSedes = [...SEDES_CODIGOS]
    .sort((a, b) => cmpEs(a.sede, b.sede))
    .map(s => `<option value="${esc(s.sede)}">${esc(s.sede)}</option>`)
    .join('');
  const opsCodigos = [...SEDES_CODIGOS]
    .sort((a, b) => cmpEs(a.codigo, b.codigo))
    .map(s => `<option value="${esc(s.codigo)}">${esc(s.codigo)}</option>`)
    .join('');

  panel.innerHTML = `
    <form id="form-diagnostico" class="formulario-diagnostico" novalidate>
      <h2>Formulario de Diagnóstico - Soporte en Sitio</h2>

      <!-- ═══════════ SECCIÓN: INFORMACIÓN GENERAL ═════════════ -->
      <fieldset class="seccion">
        <legend>Información General</legend>
        <div class="campos-grid">
          <div class="campo">
            <label for="sede">Sede *</label>
            <select id="sede" name="sede" required>
              <option value="">— Selecciona —</option>
              ${opsSedes}
            </select>
          </div>
          <div class="campo">
            <label for="fecha">Fecha *</label>
            <input type="date" id="fecha" name="fecha" value="${hoy}" readonly required>
          </div>
          <div class="campo">
            <label for="cedula-usuario">Cédula usuario *</label>
            <input type="number" id="cedula-usuario" name="cedulaUsuario" placeholder="Ej: 12345678" required>
          </div>
          <div class="campo">
            <label for="nombre-usuario">Nombre usuario *</label>
            <input type="text" id="nombre-usuario" name="nombreUsuario" placeholder="Se autocompleta por cédula" readonly required>
          </div>
          <div class="campo campo-full">
            <label for="area-usuario">Área del usuario *</label>
            <input type="text" id="area-usuario" name="areaUsuario" placeholder="Ej: Sistemas, Contabilidad…" required>
          </div>
        </div>
      </fieldset>

      <!-- ═══════════ SECCIÓN: INFORMACIÓN DEL EQUIPO ═══════════ -->
      <fieldset class="seccion">
        <legend>Información del Equipo</legend>
        <div class="campos-grid">
          <div class="campo">
            <label for="ubicacion-fisica">Ubicación física *</label>
            <select id="ubicacion-fisica" name="ubicacionFisica" required>
              <option value="">— Selecciona código —</option>
              ${opsCodigos}
            </select>
          </div>
          <div class="campo">
            <label for="marca">Marca *</label>
            <input type="text" id="marca" name="marca" placeholder="Se autocompleta por serial" readonly required style="text-transform:uppercase;">
          </div>
          <div class="campo">
            <label for="serial">Serial *</label>
            <input type="text" id="serial" name="serial" placeholder="Ej: MXL53914RF" required>
          </div>
          <div class="campo">
            <label for="modelo">Modelo *</label>
            <input type="text" id="modelo" name="modelo" placeholder="Se autocompleta por serial" readonly required style="text-transform:uppercase;">
          </div>
          <div class="campo">
            <label for="etiqueta">Etiqueta * <small>(exactamente 7 caracteres)</small></label>
            <input type="text" id="etiqueta" name="etiqueta" placeholder="Se autocompleta por serial" maxlength="7" readonly required>
          </div>
          <div class="campo">
            <label for="procesador">Procesador *</label>
            <select id="procesador" name="procesador" required>
              <option value="">— Selecciona —</option>
              <option>INTEL CORE i5</option>
              <option>INTEL CORE i7</option>
              <option>INTEL CORE i9</option>
              <option>No Aplica</option>
            </select>
          </div>
          <div class="campo">
            <label for="version-so">Versión SO *</label>
            <select id="version-so" name="versionSO" required>
              <option value="">— Selecciona —</option>
              <option>25H2</option>
              <option>24H2</option>
              <option>26H1</option>
              <option>No Aplica</option>
            </select>
          </div>
          <div class="campo">
            <label for="ram">RAM *</label>
            <select id="ram" name="ram" required>
              <option value="">— Selecciona —</option>
              <option>8 GB</option>
              <option>16 GB</option>
              <option>24 GB</option>
              <option>32 GB</option>
              <option>No Aplica</option>
            </select>
          </div>
          <div class="campo">
            <label for="nombre-equipo">Nombre del equipo *</label>
            <input type="text" id="nombre-equipo" name="nombreEquipo" placeholder="Ej: DESK-ADMON-01" required>
          </div>
          <div class="campo">
            <label for="sistema-operativo">Sistema Operativo *</label>
            <select id="sistema-operativo" name="sistemaOperativo" required>
              <option value="">— Selecciona —</option>
              <option>WIN 11 PRO</option>
              <option>LINUX SUSE 15</option>
              <option>No Aplica</option>
            </select>
          </div>
          <div class="campo">
            <label for="version-office">Versión de Office *</label>
            <select id="version-office" name="versionOffice" required>
              <option value="">— Selecciona —</option>
              <option>Office 365</option>
              <option>No Aplica</option>
            </select>
          </div>
          <div class="campo">
            <label for="hd">HD *</label>
            <select id="hd" name="hd" required>
              <option value="">— Selecciona —</option>
              <option>256 GB</option>
              <option>512 GB</option>
              <option>1 TB</option>
              <option>No Aplica</option>
            </select>
          </div>
        </div>
      </fieldset>

      <!-- ═══════════ SECCIÓN: APLICACIONES ════════════════════ -->
      <fieldset class="seccion">
        <legend>Aplicaciones</legend>
        <div class="campos-grid">
          <div class="campo">
            <label for="apps-mayor-uso">Aplicaciones de mayor uso *</label>
            <input type="text" id="apps-mayor-uso" name="appsMayorUso" placeholder="Ej: SAP, Chrome, Office…" required>
          </div>
          <div class="campo">
            <label for="apps-fuera-estandar">Aplicaciones Fuera del Estandar *</label>
            <input type="text" id="apps-fuera-estandar" name="appsFueraEstandar" placeholder="Ej: Dropbox, TeamViewer…" required>
          </div>
        </div>
      </fieldset>

      <!-- ═══════════ SECCIÓN: DIAGNÓSTICO ══════════════════════ -->
      <fieldset class="seccion">
        <legend>Diagnóstico</legend>
        ${renderDiagnosticoInteractivo()}
      </fieldset>

      <!-- ═══════════ SECCIÓN: EVIDENCIAS (opcional) ═══════════ -->
      <fieldset class="seccion">
        <legend>Evidencias de falla (opcional)</legend>
        <div class="campo campo-full">
          <label for="evidencias-input">Adjuntar imágenes (máx. 4)</label>
          <input type="file" id="evidencias-input" accept="image/*" multiple>
          <p class="evidencias-ayuda">Se redimensionan a 400px y aparecen en una página adicional del PDF.</p>
          <div class="evidencias-preview" id="evidencias-preview"></div>
        </div>
      </fieldset>

      <!-- ═══════════ SECCIÓN: DATOS DEL TÉCNICO ════════════════ -->
      <fieldset class="seccion">
        <legend>Datos del Técnico</legend>
        <div class="campos-grid">
          <div class="campo">
            <label for="nombre-tecnico">Nombre técnico *</label>
            <input type="text" id="nombre-tecnico" name="nombreTecnico" placeholder="Nombre completo del técnico" required>
          </div>
          <div class="campo">
            <label for="cedula-tecnico">Cédula técnico *</label>
            <input type="number" id="cedula-tecnico" name="cedulaTecnico" placeholder="Número de cédula" required>
          </div>
          <div class="campo campo-full">
            <label for="cargo-tecnico">Cargo técnico *</label>
            <input type="text" id="cargo-tecnico" name="cargoTecnico" placeholder="Ej: Técnico de Soporte" required>
          </div>
          <div class="campo campo-full">
            <label>Firma <small style="font-weight:400;text-transform:none;">(opcional — dibuja con mouse/dedo <strong>o</strong> carga una imagen)</small></label>
            <div class="firma-tabs">
              <button type="button" class="firma-tab firma-tab--activo" id="tab-dibujar">Dibujar firma</button>
              <button type="button" class="firma-tab" id="tab-cargar">Cargar imagen</button>
            </div>
            <!-- Panel: dibujar -->
            <div class="firma-panel" id="panel-dibujar">
              <canvas id="firma-canvas" width="400" height="110"
                style="border:1.5px solid var(--color-gris-borde);border-radius:4px;background:#fff;cursor:crosshair;touch-action:none;display:block;"></canvas>
              <div style="display:flex;gap:8px;margin-top:6px;">
                <button type="button" class="btn btn--outline" id="btn-limpiar-canvas" style="padding:5px 12px;font-size:12px;">Limpiar</button>
                <span style="font-size:11px;color:var(--color-gris-medio);align-self:center;">Dibuja tu firma arriba</span>
              </div>
            </div>
            <!-- Panel: cargar imagen -->
            <div class="firma-panel" id="panel-cargar" style="display:none;">
              <input type="file" id="firma-archivo" accept="image/*">
              <img id="firma-preview" class="firma-preview-img" src="" alt="Vista previa de la firma">
            </div>
          </div>
        </div>
      </fieldset>

      <!-- ═══════════ BOTONES ═══════════════════════════════════ -->
      <div class="formulario-diagnostico__footer">
        <button type="submit" class="btn btn--primario" id="btn-generar">
          Generar PDF
        </button>
        <button type="button" class="btn btn--outline" id="btn-limpiar">
          Limpiar formulario
        </button>
      </div>
    </form>
  `;

  // Registrar todos los eventos del formulario
  registrarEventosFormulario();
  bloquearCamposEquipo();
  initEvidenciasInput();
  autocompletarDatosTecnico();
}

/* ══════════════════════════════════════════════════════
   8. EVENTOS DEL FORMULARIO
   ══════════════════════════════════════════════════════ */
function registrarEventosFormulario() {
  // Auto-resize de textareas
  document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => autoResizeTextarea(ta));
  });

  // Autocompletado: nombre usuario por cédula
  const inputCedula = document.getElementById('cedula-usuario');
  inputCedula.addEventListener('blur', () => {
    const cedula = inputCedula.value.trim();
    if (!cedula) return;

    const nombre = buscarPorCedula(cedula);
    const campoNombre = document.getElementById('nombre-usuario');
    if (nombre) {
      campoNombre.value = nombre;
    } else {
      campoNombre.value = '';
      toast('No se encontró usuario con esa cédula en el directorio.', 'info');
    }
  });

  // Autocompletado: Marca, Modelo y Etiqueta por serial
  const inputSerial = document.getElementById('serial');
  inputSerial.addEventListener('blur', () => {
    const serial = inputSerial.value.trim();
    if (!serial) {
      limpiarCamposEquipo();
      return;
    }
    autocompletarEquipoPorSerial(serial);
  });

  initDiagnosticoInteractivo();

  // ── Tabs firma ────────────────────────────────────
  document.getElementById('tab-dibujar').addEventListener('click', () => {
    document.getElementById('panel-dibujar').style.display = '';
    document.getElementById('panel-cargar').style.display = 'none';
    document.getElementById('tab-dibujar').classList.add('firma-tab--activo');
    document.getElementById('tab-cargar').classList.remove('firma-tab--activo');
  });
  document.getElementById('tab-cargar').addEventListener('click', () => {
    document.getElementById('panel-cargar').style.display = '';
    document.getElementById('panel-dibujar').style.display = 'none';
    document.getElementById('tab-cargar').classList.add('firma-tab--activo');
    document.getElementById('tab-dibujar').classList.remove('firma-tab--activo');
  });

  // ── Canvas de firma (mouse + touch) ──────────────
  iniciarCanvasFirma();

  // ── Preview de firma desde archivo ───────────────
  document.getElementById('firma-archivo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('firma-preview');
      preview.src = ev.target.result;
      preview.classList.add('visible');
    };
    reader.readAsDataURL(file);
  });

  // ── Limpiar canvas ────────────────────────────────
  document.getElementById('btn-limpiar-canvas').addEventListener('click', () => {
    const canvas = document.getElementById('firma-canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  });

  // Limpiar formulario completo
  document.getElementById('btn-limpiar').addEventListener('click', () => {
    document.getElementById('form-diagnostico').reset();
    const preview = document.getElementById('firma-preview');
    if (preview) preview.classList.remove('visible');
    const canvas = document.getElementById('firma-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    document.querySelectorAll('.invalido').forEach(el => el.classList.remove('invalido'));
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    limpiarCamposEquipo();
    bloquearCamposEquipo();
    resetDiagnosticoInteractivo();
    evidenciasAdjuntas = [];
    renderEvidenciasPreview();
    autocompletarDatosTecnico();
    toast('Formulario limpiado.', 'info');
  });

  // Submit → generar PDF
  document.getElementById('form-diagnostico').addEventListener('submit', (e) => {
    e.preventDefault();
    generarPDF();
  });
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/** Inicializa el canvas de firma con soporte mouse y touch */
function iniciarCanvasFirma() {
  const canvas = document.getElementById('firma-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let dibujando = false;

  function getPunto(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function iniciar(e) {
    e.preventDefault();
    dibujando = true;
    const p = getPunto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function dibujar(e) {
    if (!dibujando) return;
    e.preventDefault();
    const p = getPunto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function terminar(e) {
    e.preventDefault();
    dibujando = false;
  }

  canvas.addEventListener('mousedown', iniciar);
  canvas.addEventListener('mousemove', dibujar);
  canvas.addEventListener('mouseup', terminar);
  canvas.addEventListener('mouseleave', terminar);
  canvas.addEventListener('touchstart', iniciar, { passive: false });
  canvas.addEventListener('touchmove', dibujar, { passive: false });
  canvas.addEventListener('touchend', terminar, { passive: false });
}

function marcarInvalido(el) {
  el.classList.add('invalido');
}
function limpiarInvalido(el) {
  el.classList.remove('invalido');
}

/* ══════════════════════════════════════════════════════
   AUTOCOMPLETADO DATOS TÉCNICO (Excel / Office 365)
   ══════════════════════════════════════════════════════ */

function bloquearCampoTecnico(id, valor, bloquear) {
  const el = document.getElementById(id);
  if (!el || !bloquear) return;
  el.value = valor ?? '';
  el.readOnly = true;
  el.style.background = 'var(--color-gris-fondo, #f5f5f5)';
  el.style.cursor = 'default';
}

/**
 * Autocompleta y bloquea nombre, cédula y cargo del técnico según sesión.
 */
function autocompletarDatosTecnico() {
  let campos = [];

  if (usuarioActual.loginType === 'office365') {
    const { nombreCompleto, cedulaTecnico, cargoTecnico } = usuarioActual;
    campos = [
      { id: 'nombre-tecnico', valor: nombreCompleto, bloquear: !!nombreCompleto },
      { id: 'cedula-tecnico', valor: cedulaTecnico, bloquear: !!cedulaTecnico },
      { id: 'cargo-tecnico', valor: cargoTecnico, bloquear: !!cargoTecnico },
    ];
  } else if (usuarioActual.loginType === 'admin') {
    campos = [
      { id: 'nombre-tecnico', valor: usuarioActual.nombreCompleto || '', bloquear: true },
      { id: 'cedula-tecnico', valor: usuarioActual.cedula || '', bloquear: true },
      { id: 'cargo-tecnico', valor: usuarioActual.cargo || '', bloquear: true },
    ];
  }

  campos.forEach(({ id, valor, bloquear }) => {
    bloquearCampoTecnico(id, valor ?? '', bloquear);
  });
}

/* ══════════════════════════════════════════════════════
   EVIDENCIAS DE FALLA (opcional)
   ══════════════════════════════════════════════════════ */

function redimensionarImagen(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const ratio = Math.min(maxSize / width, maxSize / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen_invalida'));
    };
    img.src = url;
  });
}

function renderEvidenciasPreview() {
  const container = document.getElementById('evidencias-preview');
  if (!container) return;

  if (!evidenciasAdjuntas.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = evidenciasAdjuntas.map((ev, i) => `
    <div class="evidencia-thumb">
      <img src="${ev.dataUrl}" alt="${ev.name}">
      <button type="button" class="evidencia-quitar" data-idx="${i}" aria-label="Quitar imagen">×</button>
    </div>
  `).join('');

  container.querySelectorAll('.evidencia-quitar').forEach(btn => {
    btn.addEventListener('click', () => {
      evidenciasAdjuntas.splice(Number(btn.dataset.idx), 1);
      renderEvidenciasPreview();
    });
  });
}

function initEvidenciasInput() {
  const input = document.getElementById('evidencias-input');
  if (!input || input.dataset.bound === '1') return;
  input.dataset.bound = '1';

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;

    const espacio = MAX_EVIDENCIAS - evidenciasAdjuntas.length;
    if (espacio <= 0) {
      toast('Máximo 4 imágenes de evidencia.', 'advertencia');
      return;
    }

    const aProcesar = files.slice(0, espacio);
    if (files.length > espacio) {
      toast(`Solo se agregaron ${espacio} imagen(es). Máximo 4.`, 'advertencia');
    }

    for (const file of aProcesar) {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name} no es una imagen válida.`, 'advertencia');
        continue;
      }
      try {
        const dataUrl = await redimensionarImagen(file);
        evidenciasAdjuntas.push({ name: file.name, dataUrl });
      } catch {
        toast(`No se pudo procesar ${file.name}.`, 'error');
      }
    }
    renderEvidenciasPreview();
  });
}

/* ══════════════════════════════════════════════════════
   9. VALIDACIÓN DEL FORMULARIO
   ══════════════════════════════════════════════════════ */
function validarFormulario() {
  let valido = true;
  const errores = [];

  // Limpiar estado previo
  document.querySelectorAll('.invalido').forEach(el => el.classList.remove('invalido'));

  const requeridos = [
    { id: 'sede',              nombre: 'Sede' },
    { id: 'cedula-usuario',    nombre: 'Cédula usuario' },
    { id: 'nombre-usuario',    nombre: 'Nombre usuario' },
    { id: 'area-usuario',      nombre: 'Área del usuario' },
    { id: 'ubicacion-fisica',  nombre: 'Ubicación física' },
    { id: 'marca',             nombre: 'Marca' },
    { id: 'serial',            nombre: 'Serial' },
    { id: 'modelo',            nombre: 'Modelo' },
    { id: 'etiqueta',          nombre: 'Etiqueta' },
    { id: 'procesador',        nombre: 'Procesador' },
    { id: 'version-so',        nombre: 'Versión SO' },
    { id: 'ram',               nombre: 'RAM' },
    { id: 'nombre-equipo',     nombre: 'Nombre del equipo' },
    { id: 'sistema-operativo', nombre: 'Sistema Operativo' },
    { id: 'version-office',    nombre: 'Versión de Office' },
    { id: 'hd',                nombre: 'HD' },
    { id: 'apps-mayor-uso',    nombre: 'Aplicaciones de mayor uso' },
    { id: 'apps-fuera-estandar', nombre: 'Aplicaciones fuera del estándar' },
    { id: 'nombre-tecnico',    nombre: 'Nombre técnico' },
    { id: 'cedula-tecnico',    nombre: 'Cédula técnico' },
    { id: 'cargo-tecnico',     nombre: 'Cargo técnico' },
  ];

  requeridos.forEach(({ id, nombre }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value.trim();
    if (!val) {
      marcarInvalido(el);
      errores.push(nombre);
      valido = false;
    }
  });

  // Validar longitud de etiqueta
  const etiquetaEl = document.getElementById('etiqueta');
  const etiquetaVal = etiquetaEl.value.trim();
  if (etiquetaVal && etiquetaVal.length !== 7) {
    marcarInvalido(etiquetaEl);
    if (!errores.includes('Etiqueta')) {
      errores.push('Etiqueta (debe tener exactamente 7 caracteres)');
    }
    valido = false;
  }

  // Validar que el serial exista en inventario (bloquea PDF si no existe)
  const serialEl = document.getElementById('serial');
  const serialVal = serialEl.value.trim();
  if (serialVal && !buscarEquipoPorSerial(serialVal)) {
    marcarInvalido(serialEl);
    toast('El serial no existe en el inventario. No se puede generar el PDF.', 'error');
    valido = false;
  }

  const diagVal = validarDiagnosticoInteractivo();
  if (!diagVal.valido) {
    const bloques = ['diag-bloque-descripcion'];
    if (document.getElementById('diag-tipo')?.value === 'DAAS') {
      bloques.push('diag-bloque-daas');
    } else {
      bloques.push('diag-bloque-acciones');
    }
    bloques.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('invalido');
    });
    toast(diagVal.mensaje, 'error');
    valido = false;
  }

  if (!valido) {
    toast(
      `Completa los campos obligatorios: ${errores.slice(0, 3).join(', ')}${errores.length > 3 ? '…' : ''}.`,
      'error'
    );
  }
  return valido;
}

/* ══════════════════════════════════════════════════════
   10. RECOPILAR VALORES DEL FORMULARIO
   ══════════════════════════════════════════════════════ */
function recopilarValores() {
  const get = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  // Obtener firma: primero revisa si el canvas tiene trazos, luego la imagen cargada
  let firmaBase64 = '';
  const canvas = document.getElementById('firma-canvas');
  if (canvas) {
    const panelDibujar = document.getElementById('panel-dibujar');
    const esPanelDibujar = panelDibujar && panelDibujar.style.display !== 'none';
    if (esPanelDibujar) {
      // Verificar si el canvas tiene algo dibujado
      const pixeles = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const tieneTrazo = pixeles.some((v, i) => i % 4 === 3 && v > 0);
      if (tieneTrazo) firmaBase64 = canvas.toDataURL('image/png');
    }
  }
  if (!firmaBase64) {
    const firmaPreview = document.getElementById('firma-preview');
    if (firmaPreview && firmaPreview.classList.contains('visible')) {
      firmaBase64 = firmaPreview.src;
    }
  }

  return {
    sede:              get('sede'),
    fecha:             get('fecha'),
    nombreUsuario:     get('nombre-usuario'),
    areaUsuario:       get('area-usuario'),
    cedula:            get('cedula-usuario'),
    ubicacionFisica:   get('ubicacion-fisica'),
    marca:             get('marca').toUpperCase(),
    serial:            get('serial'),
    modelo:            get('modelo').toUpperCase(),
    etiqueta:          get('etiqueta'),
    procesador:        get('procesador'),
    versionSO:         get('version-so'),
    ram:               get('ram'),
    nombreEquipo:      get('nombre-equipo'),
    sistemaOperativo:  get('sistema-operativo'),
    versionOffice:     get('version-office'),
    hd:                get('hd'),
    appsMayorUso:      get('apps-mayor-uso'),
    appsFueraEstandar: get('apps-fuera-estandar'),
    descripcionFalla:  get('descripcion-falla'),
    accionesRealizadas: get('acciones-realizadas'),
    diagnosticoFinal:  get('diagnostico-final'),
    nombreTecnico:     get('nombre-tecnico'),
    cedulaTecnico:     get('cedula-tecnico'),
    cargoTecnico:      get('cargo-tecnico'),
    tipoDiagnostico:   get('diag-tipo'),
    firmaBase64,
    // Campos del test de fabricante no capturados en este formulario
    testFabricanteRealizado: '',
    testFabricanteVersion:   '',
    testFabricanteResultado: '',
    intercambioPartes:       '',
    razonSolicitud:          '',
    evidencias: evidenciasAdjuntas.map(ev => ev.dataUrl),
  };
}

/* ══════════════════════════════════════════════════════
   11. GENERACIÓN DE PDF (servidor — Puppeteer + Handlebars)
   ══════════════════════════════════════════════════════ */

async function generarPDF() {
  if (!validarFormulario()) return;

  const btnGenerar = document.getElementById('btn-generar');
  btnGenerar.disabled = true;
  btnGenerar.textContent = 'Generando PDF…';

  try {
    const valores = recopilarValores();
    const headers = { 'Content-Type': 'application/json' };
    if (tokenGuardado) {
      headers.Authorization = `Bearer ${tokenGuardado}`;
    }

    const res = await fetch('/api/generar-pdf', {
      method: 'POST',
      headers,
      body: JSON.stringify(valores),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }

    const blob = await res.blob();
    const fechaStr = valores.fecha.replace(/-/g, '');
    const filename = `diagnostico_${valores.cedula || 'sin_cedula'}_${fechaStr}.pdf`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast('PDF generado y descargado correctamente.', 'exito');
  } catch (err) {
    console.error('Error generando PDF:', err);
    toast(`Error al generar el PDF: ${err.message || 'Intenta de nuevo.'}`, 'error');
  } finally {
    btnGenerar.disabled = false;
    btnGenerar.textContent = 'Generar PDF';
  }
}

/* ── Escapa HTML para valores en elementos del DOM (opciones de select) ── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
