# Mapa de la plantilla PDF — Diagnóstico FR-BAI09.11

Guía para indicar cambios de diseño usando **filas/columnas**, **labels visibles** o **nombres técnicos** de campos.

## Archivos relacionados

| Archivo | Uso |
|---------|-----|
| [`backend/templates/diagnostico.template.hbs`](../../backend/templates/diagnostico.template.hbs) | Plantilla PDF (Puppeteer + Handlebars) |
| [`backend/templates/diagnostico.template.html`](../../backend/templates/diagnostico.template.html) | Vista previa admin (`GET /api/template`) |
| [`backend/utils/renderDiagnostico.js`](../../backend/utils/renderDiagnostico.js) | Lista de campos y compilación Handlebars |
| [`front/js/usuario.js`](../../front/js/usuario.js) | Formulario web → `recopilarValores()` |
| [`docs/referencia/Plantilla Diagnostico.xlsx`](Plantilla%20Diagnostico.xlsx) | Plantilla Excel original |

---

## Tres zonas del documento

El PDF **no** es una sola tabla. Tiene tres bloques:

```
┌─────────────────────────────────────┐
│  ENCABEZADO (sin borde de tabla)    │  ← Logos, “Formato”, código FR-BAI09.11
├─────────────────────────────────────┤
│  TABLA CENTRAL (.tabla-diagnostico) │  ← Formulario con bordes negros
├─────────────────────────────────────┤
│  PIE TÉCNICO (.footer-tecnico)      │  ← Firma, NOMBRE, CÉDULA, CARGO
└─────────────────────────────────────┘
```

| Zona | Clase CSS | ¿Usar fila/columna? |
|------|-----------|---------------------|
| Encabezado | `.header-row` | No — decir “encabezado fila 1 / fila 2” |
| Tabla central | `.tabla-diagnostico` | **Sí — R1…R25, columnas A–F** |
| Pie técnico | `.footer-tecnico` | **Sí — P1…P4** |

---

## Columnas de la tabla central (A → F)

La tabla usa **6 columnas** (A–F). Anchos actuales del PDF (`colgroup`):

| Col | Ancho | Rol habitual |
|-----|-------|--------------|
| **A** | 30% | Label izquierdo / textos largos R23–R25 |
| **B** | 13% | Valor izquierdo |
| **C** | 13% | Valor izquierdo (B+C = 26%) |
| **D** | 19% | Label derecho / REALIZADO (R22) |
| **E** | 14.5% | Valor derecho / VERSION - NOMBRE (R22) |
| **F** | 13.5% | Valor derecho / RESULTADO TEST (R22) |

Encabezados R22 (PARÁMETROS): **11pt Calibri** uniforme en D, E y F.

**Nota:** Si una celda tiene `colspan="2"`, ocupa dos columnas (ej. **B+C** o **E+F**).

---

## Filas de la tabla central (R1 – R25)

Numeración: cuenta solo las `<tr>` dentro de `.tabla-diagnostico`, de arriba hacia abajo.

| Fila | Sección / contenido | Label (texto fijo) | Dato (placeholder) | ID formulario web |
|------|---------------------|--------------------|--------------------|-------------------|
| **R1** | Título sección | UBICACIÓN Y FECHA | — | — |
| **R2** | Sede / Fecha | A: SEDE · D: FECHA | B–C: `{{sede}}` · E–F: `{{fecha}}` (PDF: **dd/mm/yyyy**) | `#sede` · `#fecha` |
| **R3** | Título sección | DATOS DEL USUARIO | — | — |
| **R4** | Usuario / Área | A: Nombre usuario · D: Área del usuario | B–C: `{{nombreUsuario}}` · E–F: `{{areaUsuario}}` | `#nombre-usuario` · `#area-usuario` |
| **R5** | Cédula / Ubicación | A: Cédula · D: Ubicación física | B–C: `{{cedula}}` · E–F: `{{ubicacionFisica}}` | `#cedula-usuario` · `#ubicacion-fisica` |
| **R6** | Título sección | DATOS DE EQUIPOS | — | — |
| **R7** | Marca / Serial | A: Marca · D: Serial | B–C: `{{marca}}` · E–F: `{{serial}}` | `#marca` · `#serial` |
| **R8** | Modelo / Etiqueta | A: Modelo · D: Etiqueta | B–C: `{{modelo}}` · E–F: `{{etiqueta}}` | `#modelo` · `#etiqueta` |
| **R9** | Título sección | CARACTERÍSTICAS DEL EQUIPO | — | — |
| **R10** | Procesador / Versión SO | A: Procesador… · D: Versión SO | B–C: `{{procesador}}` · E–F: `{{versionSO}}` | `#procesador` · `#version-so` |
| **R11** | RAM / Nombre equipo | A: RAM · D: Nombre del equipo | B–C: `{{ram}}` · E–F: `{{nombreEquipo}}` | `#ram` · `#nombre-equipo` |
| **R12** | SO / Office | A: Sistema Operativo · D: Versión de Office | B–C: `{{sistemaOperativo}}` · E–F: `{{versionOffice}}` | `#sistema-operativo` · `#version-office` |
| **R13** | HD / Apps uso | A: HD · D: Apps mayor uso (`rowspan="2"`) | B–C: `{{hd}}` · E–F: `{{appsMayorUso}}` | `#hd` · `#apps-mayor-uso` |
| **R14** | Apps fuera estándar | A: Aplicaciones Fuera del Estándar | B–C: `{{appsFueraEstandar}}` | `#apps-fuera-estandar` |
| **R15** | Título | DESCRIBA LA FALLA QUE PRESENTA EL EQUIPO | — | — |
| **R16** | Texto libre | — (A–F unidas) | `{{descripcionFalla}}` | `#descripcion-falla` |
| **R17** | Título | ACCIONES REALIZADAS PARA TRATAR DE SOLUCIONAR LA FALLA | — | — |
| **R18** | Texto libre | — (A–F unidas) | `{{accionesRealizadas}}` | `#acciones-realizadas` |
| **R19** | Título | DESCRIBA EL DIAGNÓSTICO LUEGO DE LAS ACCIONES REALIZADAS. | — | — |
| **R20** | Texto libre | — (A–F unidas) | `{{diagnosticoFinal}}` | `#diagnostico-final` |
| **R21** | Parámetros (encabezado) | A–C: celda gris vacía · D–F: PARÁMETROS | — | — |
| **R22** | Subencabezados test | D: REALIZADO · E: VERSION · F: RESULTADO | — | — |
| **R23** | Test fabricante | A–C: texto fijo | D: `{{testFabricanteRealizado}}` · E: `{{testFabricanteVersion}}` · F: `{{testFabricanteResultado}}` | *(no en formulario aún)* |
| **R24** | Intercambio partes | A–C: texto fijo | D–F: `{{intercambioPartes}}` | *(no en formulario aún)* |
| **R25** | Razón solicitud | A–C: texto fijo | D–F: `{{razonSolicitud}}` | *(no en formulario aún)* |

### Clases CSS útiles por tipo de celda

| Clase | Tipo |
|-------|------|
| `.th-seccion` | Título de sección (fondo gris `#D0CECE`) |
| `.th-seccion-contenido` | Título de bloque de texto largo |
| `.th-label` | Label de campo (negrita, fondo blanco) |
| `.td-valor` | Valor capturado del formulario |
| `.td-texto-grande` + `.td-texto-falla` / `.td-texto-acciones` / `.td-texto-diag` | Áreas de texto multilínea (R16, R18, R20) |
| `.th-label-sin-relleno` | Texto descriptivo sin negrita (R23–R25) |

---

## Pie técnico (P1 – P4)

Fuera de `.tabla-diagnostico`, tabla `.footer-tecnico`:

| Fila pie | Label | Dato (placeholder) | Origen formulario |
|----------|-------|----------------------|-------------------|
| **P1** | Firma | `{{{firmaImg}}}` | Canvas dibujar / imagen cargada |
| **P2** | NOMBRE | `{{nombreTecnico}}` | `#nombre-tecnico` |
| **P3** | CÉDULA | `{{cedulaTecnico}}` | `#cedula-tecnico` |
| **P4** | CARGO | `{{cargoTecnico}}` | `#cargo-tecnico` |

---

## Encabezado (fuera de tabla)

| Bloque | Contenido | Placeholder / fijo |
|--------|-----------|-------------------|
| Encabezado fila 1 — izquierda | Logo Corbeta | `{{logo1Src}}` |
| Encabezado fila 1 — centro | Formato / DIAGNÓSTICO DE ACTIVOS… | Texto fijo |
| Encabezado fila 1 — derecha | Código FR-BAI09.11 · Versión 1 | Texto fijo |
| Encabezado fila 2 — izquierda | Logo secundario | `{{logo2Src}}` |
| Encabezado fila 2 — centro | FORMATO DE DIAGNÓSTICO | Texto fijo |

---

## Equivalencia aproximada con Excel

Referencia: [`Plantilla Diagnostico.xlsx`](Plantilla%20Diagnostico.xlsx)

| Filas Excel (aprox.) | Sección en PDF |
|-----------------------|----------------|
| 1–3 | Encabezado |
| 4–5 | R1–R2 (Ubicación y fecha) |
| 6–8 | R3–R5 (Datos del usuario) |
| 9–11 | R6–R8 (Datos de equipos) |
| 12–17 | R9–R14 (Características) |
| 18–23 | R15–R20 (Falla / acciones / diagnóstico) |
| 24–28 | R21–R25 (Parámetros / test) |
| 29+ | Pie P1–P4 |

---

## Lista completa de placeholders (nombres técnicos)

Definidos en [`renderDiagnostico.js`](../../backend/utils/renderDiagnostico.js):

```
sede, fecha, nombreUsuario, areaUsuario, cedula, ubicacionFisica,
marca, serial, modelo, etiqueta, procesador, versionSO, ram,
nombreEquipo, sistemaOperativo, versionOffice, hd, appsMayorUso,
appsFueraEstandar, descripcionFalla, accionesRealizadas, diagnosticoFinal,
nombreTecnico, cedulaTecnico, cargoTecnico,
testFabricanteRealizado, testFabricanteVersion, testFabricanteResultado,
intercambioPartes, razonSolicitud,
firmaImg (imagen), logo1Src, logo2Src
```

En la plantilla van como `{{nombreCampo}}`, salvo firma: `{{{firmaImg}}}` (HTML seguro).

---

## Cómo pedir un cambio (ejemplos)

Puedes usar cualquiera de estos formatos:

1. **Fila + columna:**  
   *“En R16 sube la altura de la celda”*  
   *“En R2 columna E–F centra la fecha”*

2. **Label visible:**  
   *“Donde dice SEDE, el valor queda pegado al borde”*

3. **Placeholder:**  
   *“Ajusta `{{descripcionFalla}}`”*

4. **ID del formulario:**  
   *“El campo `#serial` debe ir en mayúsculas”*

5. **Pie:**  
   *“En P1 la línea de firma es muy larga”*

---

## Qué archivo se edita según el cambio

| Tipo de cambio | Archivo principal |
|----------------|-------------------|
| Layout PDF (márgenes, alturas, bordes, tipografía) | `diagnostico.template.hbs` |
| Vista previa admin | `diagnostico.template.html` |
| Campos del formulario web | `front/js/usuario.js` + HTML del formulario |
| Márgenes página / 1 hoja carta | `backend/services/pdfService.js` |
| Nuevo campo end-to-end | `.hbs` + `renderDiagnostico.js` + `usuario.js` + formulario HTML |

---

*Última actualización: alineado con plantilla FR-BAI09.11 v1 y flujo Puppeteer.*
