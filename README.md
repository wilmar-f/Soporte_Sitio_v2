# Sistema de Diagnóstico en Sitio

Aplicativo web completo para gestión de diagnósticos técnicos de equipos de cómputo.
Desarrollado con HTML5 / CSS / JavaScript Vanilla en el frontend y Node.js (Express) en el backend.

---

## Estructura del proyecto

```
/
├── front/
│   ├── pages/
│   │   ├── index.html            ← Página de login
│   │   ├── index.module.css
│   │   ├── usuario.html          ← Panel principal (formulario + PDF)
│   │   └── usuario.module.css
│   ├── css/
│   │   └── global.css            ← Variables CSS, reset, banner, toast
│   ├── js/
│   │   ├── index.js              ← Lógica de login
│   │   ├── usuario.js            ← Formulario dinámico, autocompletado, PDF
│   │   ├── banner.js             ← Componente banner reutilizable
│   │   └── toast.js              ← Componente toast reutilizable
│   └── assets/
│       └── logo1.png … logo5.png ← PENDIENTE: reemplazar con logos reales
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js               ← POST /api/login
│   │   ├── data.js               ← GET /api/usuarios, /api/inventario, /api/template
│   │   └── pdf.js                ← POST /api/generar-pdf
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── dataController.js
│   │   └── pdfController.js
│   ├── services/
│   │   └── pdfService.js         ← Puppeteer (PDF con texto seleccionable)
│   ├── utils/
│   │   ├── renderDiagnostico.js  ← Handlebars + logos embebidos
│   │   ├── readTecnicos.js       ← Login técnicos desde Excel
│   │   └── renderEvidencias.js   ← Página 2 PDF evidencias
│   ├── middleware/
│   │   └── authMiddleware.js     ← JWT (reservado para rutas futuras)
│   ├── data/
│   │   ├── tecnicos.xlsx         ← Cédula, contraseña, nombre y cargo (login)
│   │   ├── usuarios.csv          ← Datos para autocompletar nombre por cédula
│   │   └── inventario.csv        ← Datos para autocompletar etiqueta por serial
│   ├── templates/
│   │   ├── diagnostico.template.html  ← Vista previa admin (GET /api/template)
│   │   ├── diagnostico.template.hbs   ← PDF servidor (Handlebars)
│   │   └── evidencias.template.hbs    ← Página 2 PDF (imágenes)
│   └── package.json
├── .env
├── .gitignore
├── render.yaml
├── README.md
└── resumen_chat.md
```

---

## Login de técnicos (Excel)

El ingreso usa **cédula + contraseña** definidas en [`backend/data/tecnicos.xlsx`](backend/data/tecnicos.xlsx).

| Columna | Descripción |
|---------|-------------|
| Cédula | Número de cédula del técnico (usuario de login) |
| Contraseña | Clave de acceso |
| Nombre | Nombre completo (se autocompleta en "Datos del técnico") |
| Cargo | Cargo del técnico (se autocompleta y bloquea en el formulario) |

> Reemplaza `tecnicos.xlsx` con el archivo real de tu equipo y vuelve a desplegar. Las contraseñas se almacenan en texto plano dentro del archivo — no expongas ese archivo públicamente.

Para generar un archivo de ejemplo:

```bash
cd backend
node scripts/init-tecnicos-xlsx.js
```

### PDF — datos del técnico

En el pie del PDF, **nombre** y **cargo** se muestran en Title Case (ej. `Wilmar Franco`, `Soporte En Sitio`).

### Evidencias de falla (opcional)

En el formulario puedes adjuntar hasta **4 imágenes**. Se redimensionan a 400px y se agregan en una **segunda página** del PDF con el encabezado del formato (logo + código FR-BAI09.11).

---

## Ejecución en local

### Requisitos previos
- Node.js >= 18.0.0
- npm >= 8

### Pasos

```bash
# 1. Clonar o ubicarse en la raíz del proyecto
cd Diagnostico03

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Volver a la raíz y configurar variables de entorno (ya existe .env)
cd ..

# 4. Iniciar el servidor
cd backend
npm start
```

El servidor quedará corriendo en: **http://localhost:3000**

- Login: http://localhost:3000/pages/index.html (o http://localhost:3000 redirige automáticamente)
- Panel: http://localhost:3000/pages/usuario.html

### Modo desarrollo (recarga automática)

```bash
cd backend
npm run dev
```

---

## Actualización de datos CSV

Los archivos CSV son leídos del disco en **cada petición** al endpoint, por lo que no es necesario reiniciar el servidor tras actualizar los datos.

### usuarios.csv (para autocompletar nombre por cédula)

1. Abrir el archivo fuente en Excel.
2. `Archivo → Guardar como → CSV UTF-8 (delimitado por comas)`.
3. **Importante**: el delimitador debe ser `;` (punto y coma), no `,`. Si Excel guarda con `,`, reemplazar manualmente o usar la opción regional correspondiente.
4. Encabezados requeridos exactos (primera fila): `Cedula;Nombre Usuario`
5. Copiar el archivo a `/backend/data/usuarios.csv` (sobreescribir).
6. Refrescar la página en el navegador (los datos se cargan al entrar a `usuario.html`).

### inventario.csv (para autocompletar etiqueta por serial)

1. Mismo proceso que usuarios.csv.
2. Encabezados requeridos exactos (primera fila): `Nº serie;Etiqueta`
3. Copiar el archivo a `/backend/data/inventario.csv`.

---

## APIs disponibles

| Método | Endpoint           | Descripción                                    |
|--------|-------------------|------------------------------------------------|
| POST   | /api/login        | Autenticación. Body: `{usuario, contrasena}`   |
| GET    | /api/usuarios     | Retorna `[{cedula, nombreUsuario}]` desde CSV  |
| GET    | /api/inventario   | Retorna `[{serial, etiqueta}]` desde CSV       |
| GET    | /api/template     | Retorna el HTML de la plantilla de diagnóstico |
| POST   | /api/generar-pdf  | Genera PDF carta con Puppeteer. Body: campos del formulario + `firmaBase64` |

---

## Generación de PDF

El PDF se genera en el **servidor** con **Puppeteer + Handlebars** (texto seleccionable, no imagen):

1. Al hacer clic en **Generar PDF**, se valida el formulario en el navegador.
2. Los valores se envían por `POST` a `/api/generar-pdf` (JSON, límite 15 MB por la firma en base64).
3. El backend compila `diagnostico.template.hbs` con Handlebars (logos embebidos en base64).
4. Puppeteer renderiza el HTML, aplica **márgenes laterales** (~0.45 in) y **escala automática** para que todo quepa en **1 sola hoja carta**.
5. El navegador descarga el archivo: `diagnostico_{{cedula}}_{{fecha}}.pdf`

La **vista previa del formato** (solo admin) sigue usando `diagnostico.template.html` vía `/api/template`.

**Dependencias backend:** `puppeteer`, `handlebars`

**Render Free:** Chromium añade ~300–400 MB RAM; el primer PDF tras un cold start puede tardar unos segundos. Para producción intensiva, considerar plan Starter.

---

## Despliegue en Render

### Pasos

1. Crear una cuenta en [render.com](https://render.com).
2. En el Dashboard, hacer clic en **New → Web Service**.
3. Conectar el repositorio de GitHub/GitLab.
4. Render detectará automáticamente el `render.yaml` y configurará:
   - Build command: `cd backend && npm install`
   - Start command: `node backend/server.js`
5. En **Environment → Environment Variables**, agregar:
   - `JWT_SECRET`: generar un valor seguro (mínimo 32 caracteres aleatorios).
   - `PORT`: Render lo configura automáticamente (no es necesario especificarlo).
6. Hacer clic en **Create Web Service** y esperar el deploy.

### Variables de entorno necesarias en Render

| Variable   | Valor                          |
|------------|-------------------------------|
| JWT_SECRET | (valor secreto aleatorio largo) |
| PORT       | (asignado automáticamente por Render) |

> **Nota sobre el `render.yaml`**: el archivo ya está configurado con `generateValue: true` para `JWT_SECRET`, por lo que Render generará un valor seguro automáticamente en el primer deploy.

---

## Logos y assets

Colocar los logos en `/front/assets/` con los nombres:
- `logo1.png` — Logo principal (aparece en el banner y en la plantilla PDF)
- `logo2.png` — Logo secundario
- `logo3.png`, `logo4.png`, `logo5.png` — Logos adicionales del banner

Los logos que no existan serán reemplazados automáticamente por un placeholder visual.

---

## Configuración Azure AD — Ingreso Office 365

El botón **"Ingreso Office 365"** utiliza MSAL.js v2 para autenticar a los usuarios
contra el directorio de Colcomercio. Antes de que funcione, el administrador de Azure AD
debe completar los siguientes pasos:

### Pasos de registro en Azure Portal

1. Ingresar a [portal.azure.com](https://portal.azure.com) con una cuenta de administrador.
2. Navegar a **Azure Active Directory → Registros de aplicaciones → + Nuevo registro**.
3. Completar el formulario:
   - **Nombre**: `DiagnosticoApp` (o el nombre que prefieran).
   - **Tipos de cuenta admitidos**: *Solo las cuentas de este directorio organizativo*
     (tenant `06614e3a-cf1d-47ad-a25b-7a11f05b1b48`).
   - **URI de redireccionamiento**: tipo **SPA** → URL de la app desplegada.
     - Producción: `https://diagnostico.onrender.com` (ajustar al dominio real)
     - Desarrollo local: `http://localhost:3000`
     - ⚠ Agregar **ambas** si se va a probar en local y producción.
4. Hacer clic en **Registrar**.
5. En la sección **Permisos de API** → **+ Agregar un permiso → Microsoft Graph → Permisos delegados**:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
   > Estos permisos **NO requieren consentimiento del administrador**; cada usuario los autoriza individualmente al iniciar sesión por primera vez.
6. Copiar el valor de **"Id. de aplicación (cliente)"** desde la página de *Información general*.
7. Abrir el archivo `/front/js/auth-office365.js` y reemplazar el placeholder:

```js
// Antes:
const CLIENT_ID = 'REEMPLAZAR_CON_CLIENT_ID_DE_AZURE_APP_REGISTRATION';

// Después (ejemplo):
const CLIENT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

### Comportamiento tras el login O365

| Dato en Graph API | Campo en formulario  | Comportamiento si está vacío |
|-------------------|----------------------|------------------------------|
| `displayName`     | Nombre técnico       | Campo editable               |
| parte antes de `@` del `mail` (numérica) | Cédula técnico | Campo editable |
| `jobTitle`        | Cargo técnico        | Campo editable               |

La foto de perfil se muestra en el sidebar; si no está disponible (sin licencia o sin foto),
se muestra la inicial del nombre como avatar de respaldo.

---

## Seguridad (notas para producción)

- Las contraseñas en `usuarios.json` están en texto plano (MVP). Se recomienda migrar a hashing con **bcrypt** antes de producción.
- El token JWT tiene expiración de 8 horas.
- Cambiar `JWT_SECRET` en `.env` por un valor largo y aleatorio antes de desplegar.
- No subir el archivo `.env` al repositorio (ya está en `.gitignore`).
