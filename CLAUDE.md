@AGENTS.md

# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo que muestra el estado de los requerimientos del proyecto
Positiva Web 414: en qué estado va cada uno, horas consumidas vs. estimadas, y
el detalle de tareas por fase al hacer drill-down. Este es un proyecto **vivo,
construido por fases** — no asumas que la fase actual es la versión final;
consulta siempre "Estado actual" abajo antes de proponer cambios grandes.

## Estado actual: Fase 3a (Drive como fuente de datos) — completa

- Desplegado en Vercel: [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)
  (repo: `https://github.com/jebb10/Tablero.git`), sin autenticación
  todavía (login es la Fase 3 pendiente).
- Lee un Google Sheet público (export xlsx), con el ID hardcodeado en
  `workbook.ts` — ver "Fuente de datos" abajo. El xlsx local quedó
  archivado en `legado/`, ya no es la fuente activa.
- Cubre: vista principal con KPIs, búsqueda/filtros y 4 bloques de estado;
  drill-down por requerimiento con línea de tiempo de fases.
- **Sigue faltando bastante** (ver Roadmap) — falta login (Fase 3), datos
  del Gantt (Fase 4) y validar a escala (Fase 5).

## Fuente de datos

La fuente de datos es un Google Sheet (que conserva formato Excel original)
compartido como "cualquiera con el enlace puede ver". `src/lib/excel/workbook.ts`
descarga el export público en cada `loadWorkbook()`:

```
https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx
```

El `SHEET_ID` está **hardcodeado como constante** en `workbook.ts` (no es
una variable de entorno) — decisión del PO: el plan original usaba
`DASHBOARD_SHEET_ID` como env var, pero configurar env vars por ambiente
(Production/Preview/Development) requiere un plan de pago en Vercel. Como
el ID del Sheet no es un secreto (el documento ya es público, "cualquiera
con el enlace puede ver"), hardcodearlo no introduce un problema de
seguridad nuevo. Si el ID cambia (ej. el PO mueve el archivo a otro Sheet),
hay que actualizar la constante en el código y hacer deploy — no hay forma
de cambiarlo sin tocar código.
La descarga usa `next: { revalidate: 30 }` (ventana corta de revalidación,
no `no-store` estricto — amortigua picos entre clicks del botón
"Sincronizar", sin convertir RN-05 en polling) y un timeout de 10s vía
`AbortController`, con un solo intento, sin reintentos automáticos.

No hay base de datos ni caché de servidor más allá de esos 30s, porque la
regla de negocio RN-05 pide sincronización manual, sin polling. El botón
"Sincronizar" fuerza un refetch (`refresh()` de `next/cache`).

**Limitación conocida**: esto depende de que el link de Drive siga siendo
público indefinidamente (decisión explícita del PO). Si algún día se
restringe el acceso, hay que migrar a una cuenta de servicio de Google
(Sheets/Drive API) — no está planeado, pero es la salida si hace falta.

**Este proyecto solo LEE el Sheet, nunca escribe en él.**

### Estructura del Excel (relevante para la app)

- Hoja `Dashboard Principal`: catálogo de los 28 requerimientos, columnas
  `Estado`, `ITEM`, `Requerimiento`, `Mes del Requerimiento`, `Complejidad`,
  `Horas estimadas`, `Horas Ejecutadas`, `Notas`, `Hoja Detalle`, entre otras.
  Solo 7 de los 28 requerimientos tienen `Estado`/`Hoja Detalle` poblados
  (son los que tienen una hoja de detalle propia). Los otros 21 se muestran
  igual en el dashboard usando una heurística **hardcodeada en código**
  (`ESTADO_HEURISTICO` en `src/lib/excel/dashboard-sheet.ts`), basada en el valor original de
  "Completado" recuperado de un backup — deliberadamente NO se escribe de
  vuelta al Excel.
- 7 hojas de detalle por requerimiento (Siniestros, Viajeros, Página
  Noticias, Directorio Médico, Puntos de Atención, Wompi, Rediseño +Salud):
  cada una tiene una fila de metadatos (Mes/Complejidad/Prioridad/Horas), un
  header en la fila 3, y filas de tareas agrupadas por fase con un marcador
  `▶` en la columna A (`REQUERIMIENTO`, `DISEÑO`, `DESARROLLO`, `QA`,
  `PRODUCCIÓN`), terminando en una fila `TOTALES`.
- Hojas ocultas con prefijo `NO USAR - ` (no borradas, solo fuera de uso):
  `Bolsa de Horas (1)` (duplicado, violaba RN-06), `Consumo de horas por
  Requerimie` (hoja 2 original por área, superada), y las 4 hojas Gantt
  mensuales (Agosto/Julio/Junio/Mayo 2026 — integración pospuesta a una fase
  futura).

## Arquitectura

- **Next.js (App Router) + TypeScript.** OJO: esta instalación es una
  versión pre-release/canary de Next.js con cambios respecto a lo que un
  modelo de IA suele saber por defecto — ver `AGENTS.md` y
  `node_modules/next/dist/docs/` antes de asumir una API. Ejemplos ya
  encontrados: `params` en páginas es `Promise<...>` (hay que `await`),
  Server Actions usan `refresh()` de `next/cache` en vez de
  `router.refresh()`.
- **Tailwind CSS v4 + shadcn/ui**, variante **Base UI** (no Radix) — el
  preset elegido en `npx shadcn init` fue "Nova". Los componentes en
  `src/components/ui/` usan `@base-ui/react/*`, no `@radix-ui/react-*`.
- **`xlsx` (SheetJS)** para leer el workbook descargado. `loadWorkbook()`
  hace `fetch` del export xlsx de Google Drive y lo pasa a
  `XLSX.read(buffer, { type: "buffer", cellDates: true })`.
- **`lucide-react`** para íconos (mapeo por palabra clave en
  `src/lib/icons.tsx`).
- Sin base de datos, sin autenticación, sin API externa (más allá del fetch
  a Drive para el workbook).
- **Control de versiones**: repo git local, rama `master` (tracking
  `origin/main`), remoto `https://github.com/jebb10/Tablero.git`. Un solo
  commit con todo el historial real del proyecto (el commit inicial de
  `create-next-app` y el placeholder que traía el repo remoto quedaron
  reemplazados con confirmación explícita del PO — ver punto de control MVP).

### Archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/excel/workbook.ts` | Carga del workbook (`loadWorkbook()`, `async`, hace `fetch` al export xlsx de Google Drive usando el `SHEET_ID` hardcodeado) + helpers genéricos de parseo (`sheetRows`, `toNumber`, `toText`, `toDate`, `parseEtiquetaValor`, `slugify`). Sin lógica de negocio. |
| `src/lib/excel/dashboard-sheet.ts` | `getRequerimientos(wb)` — parsea `Dashboard Principal`. Contiene `ESTADO_HEURISTICO` (los 21 ítems sin hoja de detalle). Recibe el workbook ya cargado por el caller (`wb` es requerido, sin default — no puede hacer `await` en un default param). |
| `src/lib/excel/detalle-sheet.ts` | `getDetalle(hoja, wb)` — parsea una hoja de detalle (fases/tareas). Mismo patrón de `wb` requerido. |
| `src/lib/kpis.ts` | `getKPIs()`, `getCalidadDatos()` — puramente sobre el array de `Requerimiento[]` ya parseado, sin tocar el Excel. |
| `src/lib/dashboard-data.ts` | `getDashboardData()` — `async`, envuelve la lectura completa (incluida la descarga del workbook) en try/catch + caché in-memory del último resultado bueno, ahora también cubre fallos de red/timeout hacia Drive. Único punto de entrada que usa `src/app/page.tsx`. |
| `src/lib/types.ts` | Tipos compartidos (`Requerimiento`, `Fase`, `Tarea`, `KPIs`, `CalidadDatos`, etc.). No tiene un campo `estadoFuente` — se eliminó por no tener ningún consumidor en la UI (ver Roadmap, punto de control MVP). |
| `src/lib/icons.tsx` | `RequerimientoIcono` (componente, no una función que devuelve un componente — así lo exige la regla `react-hooks/static-components` de eslint) que mapea el ícono por patrón en el nombre del requerimiento. |
| `src/app/page.tsx` | Server Component: llama `getDashboardData()`, muestra solo el banner de error si no hay ningún dato previo bueno. |
| `src/components/dashboard-client.tsx` | KPIs, búsqueda/filtros, los 4 bloques de estado, botón Sincronizar + Exportar PDF, atenúa el dashboard si `error` es `true`. |
| `src/components/requerimiento-card.tsx` | Card individual ampliada (~176px, badge de mes, fila horas/fecha) (RN-04). |
| `src/components/kpi-strip.tsx` | 5 KPIs, el 5º ("Calidad de datos") con acento `"atencion"` (azul pizarra, no ámbar) y link a `#calidad-datos`. |
| `src/components/data-quality-panel.tsx` | Panel colapsable de calidad de datos — **solo evalúa los 7 requerimientos con hoja de detalle real**, nunca los 21 heurísticos. |
| `src/components/archivo-bloqueado-banner.tsx` | Banner de error + botón Reintentar (llama a `sincronizar()`), usado standalone (sin datos previos) o embebido en `dashboard-client.tsx` (con datos previos atenuados). |
| `src/components/pdf-report.tsx` | Reporte para impresión (`hidden print:block`), incluye los 28 requerimientos, sin el panel de calidad, sin numeración de página. |
| `src/components/fase-stepper.tsx` | Línea de tiempo vertical de fases en el drill-down. |
| `src/app/requerimiento/[item]/page.tsx` | Página de drill-down por requerimiento (RN-04/05). Carga el workbook una sola vez (`await loadWorkbook()`) y lo pasa a `getRequerimientos`/`getDetalle`; envuelto en try/catch propio → `<ArchivoBloqueadoBanner soloBanner />` si falla (mismo mecanismo de resiliencia que la página principal, corregido en el punto de control MVP). |
| `src/app/actions.ts` | Server Action del botón Sincronizar (`refresh()`). |
| `public/fonts/montserrat-{400,500,600,700}.woff2` | Montserrat auto-hospedada (no `next/font/google`) — cargada vía `next/font/local` en `layout.tsx`. |

## Reglas de negocio implementadas (RN, de la HU TBL_HU0001)

- **RN-01** (4 categorías de estado): bloques En curso / Pausado / No
  iniciado / Entregado en producción.
- **RN-02** (overbudget): si horas ejecutadas > estimadas, se resalta en
  rojo (`status-overbudget`).
- **RN-03** (detección de bloqueos): si `Notas` contiene "Actividad
  bloqueante" o "Espera de WS" (case-insensitive), la card lleva borde rojo
  (`status-bloqueo`) e ícono de alerta. **Corrección (2026-08-01, punto de
  control MVP)**: el texto completo de `Notas` NO se muestra en ningún lado
  hoy, ni siquiera en el drill-down — es alcance recortado confirmado por el
  PO, no un pendiente. Lo único visible relacionado es `bloqueantes`/`notas`
  a nivel de **tarea** individual en `fase-stepper.tsx`, que es un campo
  distinto (de la hoja de detalle, no de `Dashboard Principal`).
- **RN-04** (contenido de card + navegación): ver `requerimiento-card.tsx`.
- **RN-05** (sync manual, sin polling): botón "Sincronizar" ⇒
  `refresh()`, sin caché ni polling automático.
- **RN-06** (nulos como placeholder / fuente única de verdad): campos vacíos
  no rompen la UI; la hoja `Bolsa de Horas (1)` se dejó de usar por duplicar
  la fuente de verdad.
- **RN-07** (escalabilidad): la heurística y el layout están pensados para
  crecer más allá de 28 requerimientos, pero **esto no está probado a
  escala** — ver Roadmap.

## Roadmap de fases (lo que falta)

Este proyecto se construye por fases; no completes de una vez lo que
pertenece a una fase futura sin confirmarlo primero. **El orden de fases fue
reordenado por el PO el 2026-08-01** (cuestionario de 24+ preguntas) — no es
el orden original con el que arrancó el proyecto.

- **Fase 0 — Reorganización del Excel:** ✅ completa (reorg inicial:
  ocultar hojas duplicadas/obsoletas, columnas Estado/Hoja Detalle).
- **Fase 0.1 — Auditoría y estandarización de las 7 hojas de detalle:**
  ✅ completa (2026-08-01, scripts en `../scripts/`). Las 7 hojas ya eran
  muy consistentes (headers idénticos, mismas 5 fases, dropdown de Estado ya
  cubriendo cada bloque de fase). Se corrigieron 2 inconsistencias reales:
  metadata rota en "Rediseño +Salud" y una fórmula cruzada entre hojas en
  "Puntos de Atención"; además 2 en "Dashboard Principal" (casing de mes en
  fila 6, horas ejecutadas hardcodeadas en fila 11). Ver
  `../scripts/auditar_hojas.py` y `../scripts/estandarizar_hojas_detalle.py`.
  **Los 21 requerimientos con `ESTADO_HEURISTICO` quedan fuera de alcance**
  por decisión explícita del PO — se posponen a una fase futura sin definir,
  no se tocan sus datos ni se les crea hoja de detalle, sus cards siguen sin
  ser clickeables.
  (El backup fechado que este script debía dejar en la raíz del proyecto no
  aparecía al auditar el punto de control MVP — el PO confirmó que lo borró
  manualmente él mismo, no hay nada más que investigar ahí. Desde el punto
  de control, los backups nuevos se guardan en `../scripts/backups/`, no en
  la raíz.)
  ⚠️ **Pendiente de acción manual del PO**: se detectó que **todo el libro**
  (no solo lo tocado hoy) tiene fórmulas sin valor cacheado — confirmado
  comparando contra un backup pre-edición. `openpyxl` nunca calcula
  fórmulas, y `XLSX.js` (usado por `src/lib/excel/workbook.ts`) lee el valor cacheado, no la
  fórmula. Efecto: "Horas Totales Estimadas/Consumidas" en el header de las
  7 hojas de detalle, y las columnas L/M ("Horas estimadas"/"Horas
  Ejecutadas") de esas mismas 7 filas en `Dashboard Principal`, probablemente
  se ven en blanco en el dashboard hoy. **Arreglo: abrir el `.xlsx` en Excel
  real una vez y guardar (Ctrl+S)** — recalcula y cachea todas las fórmulas
  de una sola vez. No se ha hecho todavía (requiere Excel de escritorio, no
  se puede automatizar desde este entorno).
- **Fase 1 — MVP local (dashboard funcional en `localhost`):** ✅ completa.
- **Fase 2 — Marca Positiva + calidad de datos + PDF + resiliencia:**
  ✅ completa (2026-08-01). El PO redefinió esta fase por su cuenta (un
  sistema de diseño propio, ya implementado y luego retirado del repo por
  redundante — ver el punto de control MVP más abajo) y se ejecutó tras un
  segundo cuestionario de 24 preguntas. Resumen de lo implementado:
  - Recolor de marca Positiva en `globals.css` (naranja `#FF7500` como
    `--primary`, nuevo token `--status-atencion` azul pizarra) + tipografía
    Montserrat **auto-hospedada** (`public/fonts/*.woff2` + `next/font/local`,
    sin `next/font/google`).
  - 5º KPI "Calidad de datos" + panel colapsable — **alcance limitado a los
    7 requerimientos con hoja de detalle real**, nunca a los 21 heurísticos
    (evita ruido esperado). Visible para todos los usuarios.
  - Card de requerimiento ampliada (badge de mes, fila `Xh/Yh` + fecha
    límite). **Sin** la fila de "descripción corta" del diseño original —
    esa columna no existe en el Excel, se omitió hasta que haya una fuente
    de dato real.
  - Manejo de archivo bloqueado: `getDashboardData()` (hoy en
    `src/lib/dashboard-data.ts`, tras el refactor del punto de control MVP)
    envuelve la lectura en try/catch con una caché in-memory (se pierde al
    reiniciar el proceso, aceptado) del último resultado bueno; banner de
    error + dashboard atenuado, o solo banner si nunca hubo un dato bueno.
  - Exportar a PDF vía `window.print()` + `pdf-report.tsx` — incluye los
    28 requerimientos, sin el panel de calidad, sin numeración de página.
  - **Explícitamente fuera de esta fase**: indicador de frescura (pospuesto
    hasta después del despliegue, depende de `fs.statSync` sobre el archivo
    local), logo oficial (el PO no lo va a pedir a Mercadeo por ahora, el
    header se queda con el texto "Dashboard 414" tal cual, sin placeholder),
    y — otra vez — los 21 requerimientos heurísticos siguen congelados.
- **Punto de control MVP (2026-08-01):** ✅ completo. Barrido de nivelación
  pedido explícitamente por el PO para cerrar Fase 1+2 antes de seguir, de
  forma que una sesión nueva pueda retomar el proyecto leyendo solo este
  archivo. Se hizo una auditoría (documentos sueltos, arquitectura, higiene
  de git) + un cuestionario de 25 preguntas. Cambios:
  - **Git**: el repo nunca se había commiteado (solo tenía el scaffold
    inicial de `create-next-app`) — se hizo un commit único con todo el
    trabajo real, y se conectó el remoto `https://github.com/jebb10/Tablero.git`.
    De paso se repararon referencias rotas en `.git/refs` causadas por
    sincronización de Google Drive (`desktop.ini` colándose dentro de
    `.git/`) — `desktop.ini` ahora está en `.gitignore`.
  - **Documentación consolidada**: se borraron `DESIGN_SYSTEM.md`, el
    sistema de diseño interactivo `.dc.html`, y `PLAN_FASE_2.md` (ya
    ejecutados, redundantes con este archivo); se descartó definitivamente
    un plan de Fase 2 alternativo que nunca se ejecutó (reestructurar las 28
    hojas del Excel a un formato normalizado con columna "Fase" real en vez
    del marcador `▶` — si alguien lo retoma, es una idea válida a considerar
    para cuando se trabajen los 21 heurísticos, pero no está en el roadmap
    actual). `README.md` se reescribió corto, apuntando aquí.
  - **Refactor de arquitectura**: `src/lib/sheet.ts` (376 líneas, 5
    responsabilidades mezcladas) se dividió en `src/lib/excel/{workbook,
    dashboard-sheet,detalle-sheet}.ts` + `src/lib/kpis.ts` +
    `src/lib/dashboard-data.ts` (ver tabla de Archivos clave). Se corrigió
    que el drill-down no usaba el mismo manejo de errores que la página
    principal. Se eliminó el campo `estadoFuente` (calculado pero sin
    ningún consumidor real en la UI).
  - **Limpieza**: SVGs default de `create-next-app` sin usar, logs de
    desarrollo sueltos, `<html lang="en">` → `"es"`.
  - **Bug real encontrado y corregido durante la verificación**: hydration
    mismatch en `src/components/ui/progress.tsx` — Base UI calcula
    `aria-valuetext` con `Intl.NumberFormat({style:"percent"})`, y Node
    (servidor) vs. el navegador (cliente) traen versiones distintas de datos
    ICU/CLDR, que difieren en si insertan un espacio antes del `%`. Fijar un
    `locale` explícito NO alcanza (el problema es la versión de los datos,
    no el locale) — se resolvió pasando `getAriaValueText` propio que
    construye `${value}%` a mano, sin usar `Intl` para esto.
  - Diferido a propósito (no se resolvió aquí): el seam asíncrono de lectura
    del Excel y el rediseño de la caché para entorno serverless — se
    resuelven específicamente en la Fase 3 (ver limitación documentada
    arriba, en "Fuente de datos").
- **Fase 3a — Conectar Drive como fuente de datos:** ✅ completa. Arregla el
  banner de error en producción (Vercel no tenía acceso al xlsx local).
  `loadWorkbook()` pasa a `async` y descarga el export xlsx público de
  Google Drive, con `revalidate: 30` y timeout de 10s, un solo intento sin
  reintentos (ver "Fuente de datos" arriba). El `async` se propagó por
  `dashboard-sheet.ts`/`detalle-sheet.ts` (sin default en `wb`),
  `dashboard-data.ts`, `page.tsx` y `requerimiento/[item]/page.tsx`. Banner
  de error genérico ("problema de conexión con la fuente de datos"), mismo
  mensaje para cualquier falla. El xlsx local y `scripts/` (Python de Fase
  0/0.1) se archivaron en `legado/`, un nivel arriba de este repo — ya no
  se usan pero no se borraron. La sección "Convenciones al tocar el Excel
  fuente" que vivía aquí se eliminó por completo: ya no aplica, nadie va a
  volver a tocar el xlsx local con scripts. Mejora incidental: el problema
  de fórmulas sin valor cacheado (openpyxl nunca las calcula, documentado en
  Fase 0.1) ya no debería repetirse — Google Sheets sí recalcula y cachea
  fórmulas automáticamente al editar desde su UI web.
  - **Ajuste post-implementación (2026-08-01)**: el diseño original usaba
    `DASHBOARD_SHEET_ID` como variable de entorno, pero configurar env vars
    por ambiente en Vercel (Production/Preview/Development) requiere un
    plan de pago que el PO no tiene. Se cambió a un ID **hardcodeado** como
    constante en `workbook.ts` — no requiere ninguna acción manual del PO
    en Vercel, el deploy normal ya lo incluye. Sin problema de seguridad
    nuevo porque el Sheet ya era público. Si el ID cambia en el futuro, hay
    que editar la constante en código y hacer deploy.
  - Fuera de alcance de esta sub-fase (queda para la Fase 3 real): login.
    Restringir el Sheet o migrar a cuenta de servicio de Google, e
    indicador de "última sincronización", quedan diferidos indefinidamente
    salvo que el PO los pida.
- **Fase 3 — Acceso (pendiente, diseño ya definido, alcance recortado):**
  - **Descartado**: Vercel Blob para el Excel — Drive (Fase 3a) reemplazó
    esa idea, ya no aplica.
  - Auth.js (next-auth v5) con proveedor Google, sesión JWT, **sin
    restricción de dominio** (cualquier cuenta de Google entra — confirmado
    explícitamente por el PO, equipo <5 personas, todos con el mismo acceso
    de solo lectura, sin roles).
  - OJO Next 16: `middleware.ts` se renombró a `proxy.ts` — verificar
    compatibilidad de Auth.js v5 con ese rename antes de asumir la API (ver
    `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
  - Retomar el indicador de frescura pospuesto en la Fase 2 (ajustarlo para
    leer la fecha del último fetch exitoso a Drive, no `fs.statSync`).
- **Fase 4 — Datos más completos (pendiente, diseño ya definido):**
  - Integrar las 4 hojas Gantt mensuales ocultas en una vista
    `/planeacion` tipo timeline por mes.
  - Los 21 requerimientos heurísticos NO forman parte de esta fase — siguen
    pospuestos indefinidamente.
- **Fase 5 — Escala (pendiente, sin fecha, decisión explícita de no
  resolver todavía):**
  - Pese a esperar crecimiento significativo en el número de requerimientos,
    el PO decidió explícitamente **seguir leyendo el `.xlsx` en cada
    request**, sin caché ni base de datos, y **sin** soporte multi-proyecto
    (este dashboard es específico del 414). No lo cuestiones ni lo
    resuelvas sin que el PO lo pida.

Plan detallado (fuera de este repo, contexto completo de las decisiones
tomadas con el PO — Fase 0, Fase 2 rediseñada, y este punto de control MVP):
`.claude/plans/c-users-usuario-1-documents-tablero-req-lively-russell.md`.
