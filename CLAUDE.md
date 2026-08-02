@AGENTS.md

# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo que muestra el estado de los requerimientos del proyecto
Positiva Web 414: en qué estado va cada uno, horas consumidas vs. estimadas, y
el detalle de tareas por fase al hacer drill-down. Este es un proyecto **vivo,
construido por fases** — no asumas que la fase actual es la versión final;
consulta siempre "Estado actual" abajo antes de proponer cambios grandes.

## Estado actual: Fase 1 (MVP local) — completa

- Corre solo local (`npm run dev`), sin autenticación, sin despliegue.
- Lee el Excel **local** directamente (no hay integración con Google Sheets
  todavía — está deliberadamente pospuesta).
- Cubre: vista principal con KPIs, búsqueda/filtros y 4 bloques de estado;
  drill-down por requerimiento con línea de tiempo de fases.
- **Sigue faltando bastante** (ver Roadmap) — este resultado es la primera
  fase funcional, no el alcance completo.

## Fuente de datos

El Excel real vive **fuera** de este proyecto, un nivel arriba:

```
../REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx
```

`src/lib/excel/workbook.ts` lo resuelve con `path.resolve(process.cwd(), "..", "REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx")`.
No hay base de datos: cada request al servidor vuelve a leer el archivo del
disco (sin caché), porque la regla de negocio RN-05 pide sincronización
manual, sin polling. El botón "Sincronizar" solo fuerza un refetch.

**Limitación conocida, a resolver en la Fase 3 (no antes)**: la lectura es
síncrona (`fs.readFileSync`) y la caché de resiliencia de
`src/lib/dashboard-data.ts` (ver abajo) es un `let` a nivel de módulo — vive
mientras el proceso Node esté arriba. Esto funciona bien en `next dev`/`next
start`, pero es frágil en un entorno serverless (Vercel, Fase 3), donde no
hay garantía de que el mismo proceso atienda dos requests seguidos. No lo
resuelvas antes de que llegue esa fase.

**Este proyecto solo LEE el Excel, nunca escribe en él.** Cualquier
reorganización de hojas/columnas se hace con un script aparte (Python +
openpyxl), nunca desde la app Next.js.

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
- **`xlsx` (SheetJS)** para leer el Excel. Importante: usar siempre
  `fs.readFileSync(path)` + `XLSX.read(buffer, { type: "buffer" })`, **nunca**
  `XLSX.readFile(path)` — esta última lanza `"Cannot access file"` en este
  proyecto porque la detección interna de `fs` de la librería falla bajo
  Turbopack/el bundler.
- **`lucide-react`** para íconos (mapeo por palabra clave en
  `src/lib/icons.tsx`).
- Sin base de datos, sin autenticación, sin API externa.
- **Control de versiones**: repo git local, rama `master`, remoto
  `https://github.com/jebb10/Tablero.git` (rama remota `main` — al hacer
  push por primera vez, resolver la divergencia de historia con el commit
  inicial que ya existe ahí, sin forzar sin confirmar antes).

### Archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/excel/workbook.ts` | Carga del workbook (`loadWorkbook()`, síncrono vía `fs.readFileSync`) + helpers genéricos de parseo (`sheetRows`, `toNumber`, `toText`, `toDate`, `parseEtiquetaValor`, `slugify`). Sin lógica de negocio. |
| `src/lib/excel/dashboard-sheet.ts` | `getRequerimientos(wb?)` — parsea `Dashboard Principal`. Contiene `ESTADO_HEURISTICO` (los 21 ítems sin hoja de detalle). Acepta un workbook ya cargado opcional para no releer el archivo si el caller ya tiene uno (ver `requerimiento/[item]/page.tsx`). |
| `src/lib/excel/detalle-sheet.ts` | `getDetalle(hoja, wb?)` — parsea una hoja de detalle (fases/tareas). Mismo patrón de workbook opcional. |
| `src/lib/kpis.ts` | `getKPIs()`, `getCalidadDatos()` — puramente sobre el array de `Requerimiento[]` ya parseado, sin tocar el Excel. |
| `src/lib/dashboard-data.ts` | `getDashboardData()` — envuelve la lectura completa en try/catch + caché in-memory del último resultado bueno (ver limitación serverless arriba). Único punto de entrada que usa `src/app/page.tsx`. |
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
| `src/app/requerimiento/[item]/page.tsx` | Página de drill-down por requerimiento (RN-04/05). Carga el workbook una sola vez (`loadWorkbook()`) y lo pasa a `getRequerimientos`/`getDetalle`; envuelto en try/catch propio → `<ArchivoBloqueadoBanner soloBanner />` si falla (mismo mecanismo de resiliencia que la página principal, corregido en el punto de control MVP). |
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
- **Fase 3 — Despliegue y acceso (pendiente, diseño ya definido):**
  - Vercel + Vercel Blob para el Excel (el PO sube el archivo manualmente,
    ~diario, `addRandomSuffix: false` para URL estable) — sin formulario de
    subida dentro de la app.
  - Auth.js (next-auth v5) con proveedor Google, sesión JWT, **sin
    restricción de dominio** (cualquier cuenta de Google entra — confirmado
    explícitamente por el PO, equipo <5 personas, todos con el mismo acceso
    de solo lectura, sin roles).
  - OJO Next 16: `middleware.ts` se renombró a `proxy.ts` — verificar
    compatibilidad de Auth.js v5 con ese rename antes de asumir la API (ver
    `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
  - Retomar el indicador de frescura pospuesto en la Fase 2 (ajustarlo para
    leer la fecha desde Vercel Blob en vez de `fs.statSync`).
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

## Convenciones al tocar el Excel fuente

Si una tarea requiere modificar `../REQUERIMIENTOS BOLSAS DE HORAS
414.xlsx` (fuera de este repo Next.js), sigue estas reglas aprendidas por las
malas:

- Nunca borres hojas/columnas/filas. Para "eliminar" una hoja del uso
  activo: ocúltala (`sheet_state = "hidden"`) y renómbrala con el prefijo
  `NO USAR - `.
- Si la hoja tiene una Tabla de Excel definida (`ws.tables`), al renombrar un
  header o agregar una columna hay que actualizar también los metadatos de
  la tabla (`table.tableColumns[i].name`, `table.ref`) — si no, Excel pide
  reparar el archivo al abrirlo.
- Para vaciar una celda dentro del rango de una Tabla, usar `value = ""`,
  **no** `value = None` — con este archivo, escribir `None` no persiste de
  forma confiable al guardar con openpyxl (bug observado, sin causa raíz
  confirmada). Siempre verificar el resultado reabriendo el archivo en un
  proceso nuevo (o inspeccionando el XML crudo del zip) antes de dar por
  buena una edición.
- Guarda una copia de respaldo fechada antes de cualquier cambio estructural.
