# Resumen del Proyecto — Sistema de Diagnóstico en Sitio

Fecha de creación: 2024  
Última actualización: 24 de junio de 2026  
Tecnologías: HTML5 · CSS3 · JavaScript ES6 · Node.js · Express · MSAL.js v2

---

## Sesión del 24 de junio de 2026

### 1. Autenticación Office 365 (implementado)

**Solicitud:** Agregar botón "Ingreso Office 365" en `index.html` debajo de "Ingresar", con autenticación MSAL.js v2 y datos de perfil desde Microsoft Graph.

**Archivos creados/modificados:**

| Archivo | Cambio |
|---------|--------|
| `front/js/auth-office365.js` | **Nuevo** — módulo MSAL: loginPopup, acquireTokenSilent, llamadas Graph API, sessionStorage |
| `front/pages/index.html` | CDN MSAL + botón "Ingreso Office 365" + separador visual "o" |
| `front/pages/index.module.css` | Estilos `.login-separador` y `.login-o365-wrapper` |
| `front/js/index.js` | Importa `loginConOffice365`, guarda `loginType: 'admin'` en login normal |
| `front/pages/usuario.html` | CDN MSAL para logout |
| `front/js/usuario.js` | Sesión dual (admin/office365), avatar O365, autocompletado campos técnico |
| `README.md` | Sección "Configuración Azure AD" con pasos de registro |

**Configuración MSAL:**
```js
const msalConfig = {
  auth: {
    clientId: "REEMPLAZAR_CON_CLIENT_ID_DE_AZURE_APP_REGISTRATION",
    authority: "https://login.microsoftonline.com/06614e3a-cf1d-47ad-a25b-7a11f05b1b48",
    redirectUri: window.location.origin
  }
};
```

**Scopes:** `["openid", "profile", "email", "User.Read"]`

**Datos guardados en sessionStorage (login O365):**
```json
{
  "loginType": "office365",
  "nombreCompleto": "displayName de Graph",
  "correo": "mail de Graph",
  "cedulaTecnico": "parte antes del @ del correo (solo si es numérica)",
  "cargoTecnico": "jobTitle de Graph (null si vacío)",
  "fotoPerfil": "base64 de la foto"
}
```

**Comportamiento en `usuario.html`:**
- `loginType === "office365"`: foto de perfil en sidebar, nombre y correo O365, campos técnico autocompletados y readonly (excepto si `jobTitle` o cédula están vacíos).
- `loginType === "admin"`: comportamiento original sin cambios.

**Pendiente para activar O365:** El administrador de Azure AD debe registrar la app, configurar URI de redirección SPA y reemplazar el `clientId` en `auth-office365.js`.

---

### 2. Consulta: ¿Dónde desplegar gratis?

**Pregunta:** ¿GitHub Pages, Vercel o Render?

**Respuesta:**

| Plataforma | ¿Funciona sin cambios? | Observación |
|------------|------------------------|-------------|
| GitHub Pages | ❌ No | Solo estáticos; no hay backend Node.js |
| Netlify | ❌ No | Requiere reescribir API como serverless |
| Vercel | ⚠️ Con ajustes | Necesita `vercel.json` para Express |
| **Render** | **✅ Sí** | Ya tiene `render.yaml` configurado |
| Railway | ✅ Sí | Alternativa, no duerme en free tier limitado |

**Recomendación:** Render (ya configurado en el proyecto).

---

### 3. Instrucciones de despliegue en Render

**URL desplegada:** `https://soporte-corbeta.onrender.com`

**Valores del formulario "Configure and deploy your new Web Service":**

| Campo | Valor |
|-------|-------|
| Language | **Node** |
| Branch | `main` (o la rama principal del repo) |
| Region | Oregon (US West) u otra cercana |
| Root Directory | *(vacío)* |
| Build Command | `cd backend && npm install` |
| Start Command | `node backend/server.js` |
| Instance Type | Free |

**Variables de entorno:**

| NAME | VALUE |
|------|-------|
| `JWT_SECRET` | Clic en **Generate** (valor aleatorio seguro) |

No agregar `PORT` manualmente — Render la asigna automáticamente.

---

### 4. Problema reportado en producción (Render)

**Síntomas:**
- Al inicio la página cargaba bien; luego dejó de verse con estilos (sin banner azul, botones grises del navegador).
- Login con `Admin` / `123456` no funcionaba desde el navegador.

**Diagnóstico realizado:**

1. **Backend OK:** La API `POST /api/login` en producción respondió `200` con credenciales `Admin` / `123456` y devolvió token JWT.
2. **Archivos en Git OK:** Todos los archivos de `front/js/`, `front/css/`, `backend/data/usuarios.json` están versionados.
3. **CSS y JS accesibles:** `global.css`, `index.module.css` e `index.js` responden correctamente en la URL de Render (cuando el servicio está despierto).
4. **Causa probable:** Plan **Free** de Render — el servicio se duerme tras ~15 min sin uso; en el "cold start" (30–90 s) HTML puede cargar pero CSS/JS fallan intermitentemente. Sin JavaScript, el botón "Ingresar" no ejecuta el `fetch` al backend.

**Pasos de solución recomendados:**
1. Abrir `https://soporte-corbeta.onrender.com` y esperar 60–90 segundos.
2. Recargar con **Ctrl + Shift + R** (sin caché).
3. Verificar en F12 → Network que no haya archivos en rojo (`global.css`, `index.js`).
4. Login: usuario `Admin` (A mayúscula), contraseña `123456`.
5. Si persiste: Manual Deploy en Render → esperar estado **Live**.

**Mejora futura sugerida (no implementada aún):**
- Cambiar rutas relativas (`../css/...`) por absolutas (`/css/...`, `/js/...`).
- Plan de pago Render (~$7/mes) o UptimeRobot para evitar cold start.

---

### 5. Credenciales de prueba

| Usuario | Contraseña | Tipo |
|---------|------------|------|
| `Admin` | `123456` | Login local (JWT) |

---

## Historial del proyecto (sesiones anteriores)

### Requisitos solicitados (creación inicial)

1. Análisis del Excel (`Plantilla Diagnostico.xlsx`) → `diagnostico.template.html` con placeholders `{{campo}}`.
2. Estructura `front/` + `backend/` modular.
3. Banner global con 5 logos.
4. Login JWT con sessionStorage y toast.
5. Panel usuario con sidebar/panel responsive.
6. Formulario dinámico con autocompletado desde CSV.
7. PDF 100% frontend (html2canvas + jsPDF).
8. Despliegue Render con `render.yaml`.
9. Documentación README y resumen_chat.

### Correcciones iterativas (junio 2026)

| Fecha | Cambio |
|-------|--------|
| 13 jun | Logos PNG con fondo blanco: se quitó `filter: brightness(0) invert(1)` del banner |
| 13 jun | PDF: se corrigió carga de html2canvas/jsPDF (integrity incorrecto en CDN) |
| 13 jun | PDF: ajuste a 1 página carta, sin recorte horizontal |
| 14 jun | Firma: canvas mouse/táctil + carga de imagen (opcional) |
| 14 jun | "Versión SO" → select (25H2, 24H2, 26H1, No Aplica) |
| 14 jun | Renombrado "Apps fuera del estándar" → "Aplicaciones Fuera del Estandar" |
| 14 jun | Plantilla PDF: márgenes, borde `.plantilla-wrapper`, firma alineada a la izquierda |

---

## Análisis del archivo Excel (Plantilla Diagnostico.xlsx)

### Estructura detectada

| Filas Excel | Contenido |
|-------------|-----------|
| Header PDF | Logo + Título + Código FR-BAI09.11 |
| Fila 3 | "FORMATO DE DIAGNOSTICO" |
| Fila 4-5 | UBICACIÓN Y FECHA (SEDE + FECHA) |
| Fila 6-8 | DATOS DEL USUARIO |
| Fila 9-11 | DATOS DE EQUIPOS |
| Fila 12-17 | CARACTERÍSTICAS DEL EQUIPO |
| Fila 18-23 | Falla, acciones, diagnóstico |
| Fila 24-28 | TEST DEL FABRICANTE |
| Fila 29 | FIRMA |
| Fila 31-33 | NOMBRE / CÉDULA / CARGO técnico |

### Paleta de colores del Excel

| Elemento | Valor |
|----------|-------|
| Fondo sección header | `#D0CFCF` |
| Texto label | Negro, bold, Calibri 11pt |
| Fondo celda dato | Blanco |
| Bordes | 1px `#888` / medium `#444` |

---

## Decisiones técnicas

### Backend
- Express sirve `/front/` estático y expone `/api/*`.
- `csv-parser` con `separator: ';'`.
- JWT con `JWT_SECRET`, expiración 8h.
- CSV leídos del disco en cada petición.

### Frontend
- ES6 modules, sin `alert()` nativo.
- `banner.js` y `toast.js` reutilizables.
- Autocompletado por cédula/serial en `blur`.
- PDF: html2canvas + jsPDF, formato carta, 1 página.

### Autenticación (actualizado 24 jun 2026)
- **Admin:** JWT vía `POST /api/login` → `loginType: "admin"`.
- **Office 365:** MSAL.js popup → Graph API → `loginType: "office365"`.

---

## Estructura actual de archivos

```
/
├── front/
│   ├── pages/   {index.html, index.module.css, usuario.html, usuario.module.css}
│   ├── css/     {global.css}
│   ├── js/      {index.js, usuario.js, banner.js, toast.js, auth-office365.js}
│   └── assets/  {logo1–logo5.png}
├── backend/
│   ├── server.js
│   ├── routes/       {auth.js, data.js}
│   ├── controllers/  {authController.js, dataController.js}
│   ├── data/         {usuarios.json, usuarios.csv, inventario.csv}
│   ├── templates/    {diagnostico.template.html}
│   └── package.json
├── .env
├── .gitignore
├── render.yaml
├── README.md
└── resumen_chat.md
```

---

## Pendientes

| Ítem | Descripción |
|------|-------------|
| **Azure AD clientId** | Reemplazar placeholder en `auth-office365.js` para activar login O365 |
| **URI redirección O365** | Agregar `https://soporte-corbeta.onrender.com` en Azure App Registration |
| **Logos** | Reemplazar `logo1.png` … `logo5.png` con logos reales |
| **Contraseñas** | Migrar `usuarios.json` a bcrypt antes de producción |
| **JWT middleware** | Validar token en endpoints `/api/usuarios` e `/api/inventario` |
| **Rutas absolutas** | Cambiar `../css/` y `../js/` por `/css/` y `/js/` para mayor estabilidad en Render |
| **Plan Render** | Considerar plan de pago o UptimeRobot para evitar cold start en free tier |
| **Campos TEST** | Añadir al formulario campos de plantilla aún sin input |
| **OneDrive/SharePoint** | Subida automática de PDF vía Graph API (fuera de alcance actual) |

---

## URLs y referencias

- **Producción Render:** https://soporte-corbeta.onrender.com
- **Login local:** http://localhost:3000
- **MSAL CDN:** https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js
- **Tenant Azure AD:** `06614e3a-cf1d-47ad-a25b-7a11f05b1b48`
- **Transcript completo del chat:** `agent-transcripts/31c3e173-c657-453a-9080-5307476d3654/`
