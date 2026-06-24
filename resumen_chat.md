# Resumen del Proyecto — Sistema de Diagnóstico en Sitio

Fecha de creación: 2024
Tecnologías: HTML5 · CSS3 · JavaScript ES6 · Node.js · Express

---

## Requisitos solicitados

1. **Análisis del Excel** (`Plantilla Diagnostico.xlsx`) y generación de `diagnostico.template.html` con placeholders `{{campo}}`, fiel al diseño original.
2. **Estructura de proyecto** separada en `front/` y `backend/` con modularidad clara.
3. **Banner global** fijo, responsive, con 5 logos, reutilizable en todas las páginas.
4. **Login funcional** contra backend (JWT), con validación, sessionStorage y toast de error/éxito.
5. **Página de usuario** con layout Grid (sidebar 30% / panel 70%), responsive.
6. **Formulario dinámico** con todas las secciones, selects con valores exactos, textareas auto-resize.
7. **Autocompletado** de nombre por cédula y etiqueta por serial, cargando datos de CSV reales.
8. **Generación de PDF 100% en el browser** usando html2canvas + jsPDF.
9. **Despliegue en Render** listo con `render.yaml`.
10. **Documentación** en `README.md` y `resumen_chat.md`.

---

## Análisis del archivo Excel (Plantilla Diagnostico.xlsx)

El archivo fue extraído como ZIP y analizado a partir de sus XML internos:

### Estructura detectada en `xl/worksheets/sheet1.xml` + `xl/sharedStrings.xml`

| Filas Excel | Contenido                                       |
|-------------|------------------------------------------------|
| Header PDF  | Logo (image1.png) + Título centrado + Código FR-BAI09.11 |
| Fila 3      | Título "FORMATO DE DIAGNOSTICO" (fuente 18pt bold) |
| Fila 4      | Sección "UBICACIÓN Y FECHA"                    |
| Fila 5      | SEDE + FECHA (2 columnas)                      |
| Fila 6      | Sección "DATOS DEL USUARIO"                    |
| Filas 7-8   | Nombre usuario / Área / Cédula / Ubicación física |
| Fila 9      | Sección "DATOS DE EQUIPOS"                     |
| Filas 10-11 | Marca / Serial / Modelo / Etiqueta             |
| Fila 12     | Sección "CARACTERÍSTICAS DEL EQUIPO"           |
| Filas 13-17 | Procesador, RAM, SO, Versión Office, HD, Apps  |
| Fila 18     | Sección "DESCRIBA LA FALLA..."                 |
| Fila 19     | Área de texto libre (falla)                    |
| Fila 20     | Sección "ACCIONES REALIZADAS..."               |
| Fila 21     | Área de texto libre (acciones)                 |
| Fila 22     | Sección "DESCRIBA EL DIAGNÓSTICO..."           |
| Fila 23     | Área de texto libre (diagnóstico)              |
| Filas 24-28 | Tabla TEST DEL FABRICANTE (con columnas REALIZADO / VERSION / RESULTADO) |
| Fila 29     | Área de FIRMA                                  |
| Filas 31-33 | NOMBRE / CÉDULA / CARGO del técnico            |

### Paleta de colores del Excel

| Elemento            | Valor calculado              |
|---------------------|------------------------------|
| Fondo sección header | `#D0CFCF` (lt2 theme #E7E6E6 con tint -0.0999) |
| Texto de label      | Negro, bold, Calibri 11pt     |
| Fondo celda de dato | Blanco                        |
| Bordes              | 1px solid #888 (thin) / #444 (medium) |

### Imágenes en el Excel
- `xl/media/image1.png` — Logo principal (posición: rows 0-2, cols 0-1 → encabezado izquierdo)
- `xl/media/image2.jpeg` — Logo secundario o firma placeholder (rows 28-29)

---

## Decisiones técnicas

### Backend
- **Express** sirve `/front/` como archivos estáticos y expone rutas `/api/*`.
- **csv-parser** con `separator: ';'` y `mapHeaders` por índice (index 0 → `cedula`/`serial`, index 1 → `nombreUsuario`/`etiqueta`) para manejar las cabeceras especiales (`Nº serie`, `Nombre Usuario`).
- **jsonwebtoken**: token firmado con `JWT_SECRET` del `.env`, expiración 8h.
- Contraseñas en texto plano en `usuarios.json` (MVP). Documentado el upgrade a bcrypt.
- Los CSV se leen del disco en cada petición (sin caché) para permitir actualizaciones sin reiniciar.
- Endpoint `GET /api/template` retorna el HTML de la plantilla como texto plano.

### Frontend
- **ES6 modules**: `import/export` en todos los archivos JS; ningún `alert()` nativo.
- **banner.js**: módulo reutilizable importado en `index.js` y `usuario.js`.
- **toast.js**: componente `toast(msg, tipo)` con tipos `exito | error | info | advertencia`, auto-descarta en 4.5s.
- **Autocompletado**: al `blur` de los campos cédula y serial; comparación exacta para cédula, case-insensitive para serial. Si no se encuentra, toast de tipo `info`.
- **Auto-resize textareas**: listener `input` que ajusta `style.height = scrollHeight`.
- **Validación de etiqueta**: exactamente 7 caracteres, verificado en `blur` y en submit.
- **Mapa SEDES_CODIGOS**: array de 160+ objetos `{sede, codigo}`, disponible en memoria para validaciones futuras.

### Generación de PDF (100% frontend)
```
Clic "Generar PDF"
  → validarFormulario()
  → fetch GET /api/template → string HTML
  → reemplazarPlaceholders(html, valores)    ← regex /\{\{(\w+)\}\}/g
  → renderDiv.innerHTML = htmlRelleno
  → await new Promise(r => setTimeout(r, 300))  ← esperar pintado
  → html2canvas(renderDiv, { scale: 2 })
  → jsPDF('portrait', 'mm', 'a4')
  → pdf.addImage(canvas, 'JPEG', ...) con soporte multi-página
  → pdf.save(`diagnostico_${cedula}_${fecha}.pdf`)
  → toast éxito
```

**CDNs utilizados:**
- `html2canvas@1.4.1` (cdnjs)
- `jsPDF@2.5.1` (cdnjs)

---

## Estructura final de archivos

```
/
├── front/
│   ├── pages/ {index.html, index.module.css, usuario.html, usuario.module.css}
│   ├── css/   {global.css}
│   ├── js/    {index.js, usuario.js, banner.js, toast.js}
│   └── assets/ {logo1–logo5.png — pendientes de reemplazar}
├── backend/
│   ├── server.js
│   ├── routes/  {auth.js, data.js}
│   ├── controllers/ {authController.js, dataController.js}
│   ├── data/ {usuarios.json, usuarios.csv ~12K filas, inventario.csv ~12K filas}
│   ├── templates/ {diagnostico.template.html}
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
| **Logos** | Reemplazar `/front/assets/logo1.png` … `logo5.png` con los logos reales de la organización. Los logos también se referencian en `diagnostico.template.html`. |
| **Contraseñas** | Migrar `usuarios.json` de texto plano a hash `bcrypt` antes de producción. |
| **JWT middleware** | Los endpoints `/api/usuarios` e `/api/inventario` actualmente no validan el JWT en el backend. Se puede añadir un middleware `verifyToken` si se requiere mayor seguridad. |
| **Campos TEST** | Los campos `{{testFabricanteRealizado}}`, `{{testFabricanteVersion}}`, `{{testFabricanteResultado}}`, `{{intercambioPartes}}` y `{{razonSolicitud}}` están en la plantilla pero no en el formulario. Se pueden añadir a la sección "Diagnóstico" del formulario. |
| **OneDrive/SharePoint** | Si se requiere subir el PDF automáticamente tras generarlo, implementar Microsoft Graph API con una app registrada en Azure AD (app registration, permisos `Files.ReadWrite`, OAuth 2.0 flow). Esto queda fuera del alcance actual. |
| **Multi-usuario** | Actualmente solo existe el usuario `Admin`. Para agregar más usuarios, editar `usuarios.json` manualmente. Una mejora futura sería un CRUD de usuarios en el panel. |
| **Mejoras de UX** | Indicador de carga (spinner) durante la generación del PDF, historial de diagnósticos generados, modo oscuro. |
