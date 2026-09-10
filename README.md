# Sistema de Diagnóstico en Sitio - Wilmar Franco

Automatizacion con un Aplicativo web completo para gestión de diagnósticos técnicos de equipos de cómputo.
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
│       ├── header/               ← Logos del banner web (index / usuario)
│       └── pdf/                  ← Logos embebidos en plantilla PDF
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
│   │   ├── readInventario.js     ← Inventario desde Excel
│   │   └── renderEvidencias.js   ← Página 2 PDF evidencias
│   ├── middleware/
│   │   └── authMiddleware.js     ← JWT (reservado para rutas futuras)
│   ├── data/
│   │   ├── tecnicos.xlsx         ← Cédula, contraseña, nombre y cargo (login)
│   │   ├── usuarios.csv          ← Datos para autocompletar nombre por cédula
│   │   ├── inventario.xlsx       ← Datos para autocompletar equipo por serial
│   │   └── inventario.csv        ← Respaldo / export legacy (no lo lee la app)
│   ├── templates/
│   │   ├── diagnostico.template.html  ← Vista previa admin (GET /api/template)
│   │   ├── diagnostico.template.hbs   ← PDF servidor (Handlebars)
│   │   └── evidencias.template.hbs    ← Página 2 PDF (imágenes)
│   └── package.json
├── .env
├── .gitignore
├── render.yaml