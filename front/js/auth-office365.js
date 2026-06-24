/**
 * auth-office365.js — Autenticación con Microsoft Office 365 vía MSAL.js v2
 *
 * REQUISITO PREVIO (LEER ANTES DE USAR):
 * ─────────────────────────────────────
 * El administrador de Azure AD de Colcomercio debe registrar esta aplicación
 * en portal.azure.com y reemplazar el valor del clientId.
 * Ver sección "Configuración Azure AD" en README.md para los pasos detallados.
 *
 * Mientras el clientId sea el placeholder, el botón "Ingreso Office 365"
 * mostrará un error al intentar usarlo.
 */
import { toast } from './toast.js';

/* ══════════════════════════════════════════════════════
   CONFIGURACIÓN MSAL
   ══════════════════════════════════════════════════════ */

// ⚠ REEMPLAZAR con el "Id. de aplicación (cliente)" de Azure App Registration:
const CLIENT_ID = 'REEMPLAZAR_CON_CLIENT_ID_DE_AZURE_APP_REGISTRATION';

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: 'https://login.microsoftonline.com/06614e3a-cf1d-47ad-a25b-7a11f05b1b48',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Permisos mínimos — no requieren consentimiento de administrador de tenant
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

let _msalInstance = null;

function getMsalInstance() {
  if (!_msalInstance) {
    if (typeof msal === 'undefined') {
      throw new Error(
        'La librería MSAL no está disponible. Verifica que el CDN esté cargado.'
      );
    }
    _msalInstance = new msal.PublicClientApplication(msalConfig);
  }
  return _msalInstance;
}

/* ══════════════════════════════════════════════════════
   LOGIN CON OFFICE 365
   ══════════════════════════════════════════════════════ */

/**
 * Inicia el flujo de autenticación Office 365 vía loginPopup.
 * @param {HTMLButtonElement} btnElement — botón que disparó el evento (para deshabilitar)
 */
export async function loginConOffice365(btnElement) {
  if (CLIENT_ID === 'REEMPLAZAR_CON_CLIENT_ID_DE_AZURE_APP_REGISTRATION') {
    toast(
      'El botón Office 365 requiere configuración en Azure AD. Contacta al administrador.',
      'advertencia'
    );
    return;
  }

  if (btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = 'Conectando…';
  }

  try {
    const instance = getMsalInstance();

    // 1. Login popup — abre la ventana de Microsoft
    const loginResponse = await instance.loginPopup({ scopes: SCOPES });

    // 2. Obtener access token para Graph API
    let accessToken;
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['User.Read'],
        account: loginResponse.account,
      });
      accessToken = tokenResponse.accessToken;
    } catch {
      // Silent falló (requiere interacción) → popup de fallback
      const tokenResponse = await instance.acquireTokenPopup({
        scopes: ['User.Read'],
        account: loginResponse.account,
      });
      accessToken = tokenResponse.accessToken;
    }

    // 3. Obtener perfil y foto de Graph API en paralelo
    const [resultPerfil, resultFoto] = await Promise.allSettled([
      fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()),
      fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => {
        if (!r.ok) throw new Error('foto_no_disponible');
        return r.blob();
      }),
    ]);

    const perfil = resultPerfil.status === 'fulfilled' ? resultPerfil.value : {};

    // 4. Convertir foto a base64 — fallback silencioso si no está disponible
    let fotoPerfil = null;
    if (resultFoto.status === 'fulfilled') {
      fotoPerfil = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(resultFoto.value);
      });
    }

    // 5. Extraer cédula del correo (ej: 1121855145@colcomercio.com.co → '1121855145')
    const correo = perfil.mail || perfil.userPrincipalName || '';
    const parteLocal = correo.includes('@') ? correo.split('@')[0] : '';
    // Solo considerar cédula si la parte local es numérica
    const cedulaTecnico = /^\d+$/.test(parteLocal) ? parteLocal : '';

    // 6. jobTitle: null si está vacío (indica que el campo debe quedar editable)
    const cargoTecnico = perfil.jobTitle?.trim() || null;

    // 7. Guardar sesión en sessionStorage
    sessionStorage.setItem('loginType', 'office365');
    sessionStorage.setItem(
      'o365session',
      JSON.stringify({
        nombreCompleto: perfil.displayName || loginResponse.account.name || '',
        correo,
        cedulaTecnico,
        cargoTecnico,
        fotoPerfil,
      })
    );

    toast('Sesión de Office 365 iniciada. Redirigiendo…', 'exito');
    setTimeout(() => { window.location.href = '/pages/usuario.html'; }, 900);

  } catch (err) {
    console.error('Error en login Office 365:', err);
    const cancelado =
      err.errorCode === 'user_cancelled' ||
      err.errorCode === 'access_denied'  ||
      err.message?.toLowerCase().includes('cancel') ||
      err.message?.toLowerCase().includes('closed');

    if (cancelado) {
      toast('Inicio de sesión cancelado.', 'info');
    } else {
      toast('Error al conectar con Office 365. Intenta de nuevo.', 'error');
    }
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = 'Ingreso Office 365';
    }
  }
}

/* ══════════════════════════════════════════════════════
   LOGOUT OFFICE 365
   ══════════════════════════════════════════════════════ */

/**
 * Limpia la sesión MSAL en caché al cerrar sesión.
 * Usa logoutPopup para no redirigir la página.
 */
export function logoutOffice365() {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      instance.logoutPopup({ account: accounts[0] }).catch(() => {});
    }
  } catch {
    // Error al cerrar sesión MSAL — ignorar para no bloquear el flujo local
  }
}
