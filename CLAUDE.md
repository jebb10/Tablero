@AGENTS.md

# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo que muestra el estado de los requerimientos del proyecto
Positiva Web 414: en qué estado va cada uno, horas consumidas vs. estimadas, y
el detalle de tareas por fase al hacer drill-down. Este es un proyecto **vivo,
construido por fases** — no asumas que la fase actual es la versión final;
consulta siempre "Estado actual" abajo antes de proponer cambios grandes.

## Estado actual: Fase A (Supabase) — completa

- Desplegado en Vercel: [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)
  (repo: `https://github.com/jebb10/Tablero.git`), sin autenticación
  todavía (login es la Fase B pendiente — ver `ROADMAP_V2.md`).
- El PO decidió revertir la decisión de "sin BD, sin multi-proyecto" de la
  antigua Fase 5 (ver más abajo) para convertir esto en una aplicación real:
  multi-proyecto, con login por roles y escritura. La migración a Supabase
  (Fase A del nuevo roadmap) ya está completa; faltan Fase 0 (fundaciones:
  migraciones versionadas, tipos generados, CI, backup — ver más abajo),
  Fase B (auth/roles), Fase C (pantallas de escritura) y Fase D (documentos
  versionados) — ver `ROADMAP_V2.md` para el diseño vigente completo y las
  decisiones tomadas (`ROADMAP_SUPABASE.md` queda como historial, superado).
- Lee de un proyecto Supabase (Postgres + API REST), ver "Fuente de datos"
  abajo. **El Google Sheet / `.xlsx` que se usaba antes de la Fase A ya no
  existe** — el archivo (`legado/REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx`)
  se borró físicamente el 2026-08-06, una vez verificada la migración. No
  es fuente de datos, no requiere mantenimiento, y no hace falta seguir
  pensando en él (el gotcha de fórmulas sin recalcular, las hojas ocultas,
  etc. son historia, no tareas pendientes).
- **Pendiente por definir: estrategia de backup.** El `.xlsx` legado hacía
  de respaldo informal; al borrarlo, todavía no hay un plan de backup
  explícito para los datos de Supabase más allá del point-in-time recovery
  que ofrece el plan pagado (el free tier no lo incluye con la misma
  profundidad). Antes de confiar en esto a largo plazo, hay que decidir algo
  como: exports periódicos (`pg_dump` o el backup nativo de Supabase),
  automatizados vía GitHub Actions o Vercel Cron. No implementado todavía.
- Cubre: vista principal con KPIs, búsqueda/filtros, 4 bloques de estado y
  semáforo por fecha límite; drill-down por requerimiento con línea de
  tiempo de fases; vista `/planeacion` (Gantt) con sidebar colapsable.
- **Prioridad inmediata de seguimiento — refinar el Gantt, no el Excel**:
  `/planeacion` usa `due_date` como marcador de un día porque
  `planned_start_date`/`planned_end_date` quedaron `NULL` en la migración
  (ver "Cierre de Fase A" en `ROADMAP_SUPABASE.md` — el match contra las 4
  hojas Gantt ocultas del Excel no fue viable). Cuando se retome este
  dashboard, este es el punto a resolver antes que nada, con las opciones
  ya evaluadas ahí.
- **Sigue faltando** (ver `ROADMAP_V2.md`, fuente de verdad vigente — anula
  a `ROADMAP_SUPABASE.md`): Fase 0 (fundaciones: migraciones versionadas,
  tipos generados, CI, backup), Fase B (Supabase Auth + roles Admin/Viewer),
  Fase C (pantallas de escritura), Fase D (documentos versionados en
  Storage).

## Fuente de datos

La fuente de datos es un proyecto Supabase (Postgres + API REST vía
`@supabase/supabase-js`, cliente `anon`/`publishable`).
`src/lib/supabase/server.ts` crea el cliente; `src/lib/dashboard-data.ts` y
`src/app/requerimiento/[item]/page.tsx` hacen las consultas. El proyecto
activo es un default hardcodeado (`positiva-web-414`) en `src/lib/project.ts`
— no hay selector de proyecto en la UI todavía porque solo existe un
proyecto real (el modelo de datos ya soporta multi-proyecto, ver
`ROADMAP_SUPABASE.md` §9).

**`SUPABASE_URL`/`SUPABASE_ANON_KEY` están hardcodeadas como constantes en
`src/lib/supabase/server.ts`, NO como env vars** — mismo patrón que el
antiguo `SHEET_ID` de la Fase 3a. Se intentó vía env vars de Vercel primero
y sí requería plan de pago (a diferencia de lo que se había asumido en
`ROADMAP_SUPABASE.md`). Sin problema de seguridad nuevo: la `anon`/
`publishable` key está diseñada para el navegador, protegida por RLS, no
por mantenerla en secreto. Si el proyecto Supabase cambia, hay que editar
esas constantes en código y hacer deploy — no hay forma de cambiarlo sin
tocar código. La `secret key` (equivalente a `service_role`) **nunca** vive
en el código — solo se usó localmente (`.env.local`, gitignored) para
correr `scripts/migrate_to_supabase.py`.

Esquema completo (DDL) en `supabase/schema.sql` — tablas `projects`,
`requirements`, `requirement_tasks`, `activity_logs` (vacía, forward-looking
para Fase C), `document_versions` (vacía, forward-looking para Fase D). RLS
habilitado con policies de solo lectura pública (sin Auth todavía — Fase B
las reemplaza por policies basadas en `auth.uid()`).

Los datos se migraron una sola vez con `scripts/migrate_to_supabase.py`
(Python + openpyxl + `supabase-py`, idempotente vía upsert) — el detalle de
esa migración (qué hoja mapeaba a qué columna, etc.) vive en
`ROADMAP_SUPABASE.md`, no hace falta repetirlo aquí. No hay polling ni
caché de servidor más allá de una caché in-memory del último resultado
bueno (para resiliencia si Supabase no responde en un request puntual) — el
botón "Sincronizar" (RN-05, tenía sentido solo cuando la fuente era externa)
se **retiró por completo**: ya no hay nada que sincronizar manualmente,
Next.js sirve datos frescos en cada carga de página. El banner de error
sigue existiendo (`archivo-bloqueado-banner.tsx`) con un botón "Reintentar"
que solo fuerza un refresh de la página (`reintentar()` en `actions.ts`).

**Este proyecto lee y (a partir de Fase C) escribirá en Supabase.** No hay
ninguna fuente de datos externa (Excel/Sheet/Drive) en este flujo — quedó
retirada por completo en la Fase A.

**Supabase también quedó asociado al repo de GitHub** (integración nativa
de Supabase con el repositorio) — verificar en el momento si eso implica un
flujo de migraciones/branching que el equipo deba seguir (ej. cambios de
esquema vía PR en vez de directamente en el SQL Editor), no asumido todavía
en este documento.

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
- **`@supabase/supabase-js`** para leer/escribir Supabase (Postgres + API
  REST). `src/lib/supabase/server.ts` crea el cliente `anon`.
- **`lucide-react`** para íconos (mapeo por palabra clave en
  `src/lib/icons.tsx`).
- Base de datos real (Supabase/Postgres) desde la Fase A. Sin autenticación
  todavía (Fase B pendiente, ver `ROADMAP_V2.md`).
- **Control de versiones**: repo git local, rama `master` (tracking
  `origin/main`), remoto `https://github.com/jebb10/Tablero.git`. Un solo
  commit con todo el historial real del proyecto (el commit inicial de
  `create-next-app` y el placeholder que traía el repo remoto quedaron
  reemplazados con confirmación explícita del PO — ver punto de control MVP).

### Archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `supabase/schema.sql` | DDL completo (tablas, RLS, seed del proyecto) — correr una sola vez en el SQL Editor de Supabase. |
| `scripts/migrate_to_supabase.py` | Script one-time (admin-run) que migró el `.xlsx` legado a Supabase vía `supabase-py`. Idempotente (upsert), reporte de verificación al final. No se vuelve a correr salvo que haya que re-migrar desde cero (`--reset`). |
| `src/lib/supabase/server.ts` | `getSupabaseClient()` — cliente `anon` de `@supabase/supabase-js`. |
| `src/lib/project.ts` | `PROJECT_SLUG` — default hardcodeado del único proyecto sembrado (`positiva-web-414`). |
| `src/lib/semaforo.ts` | `calcularSemaforo(deadline)` — rojo/ámbar/verde/sin-fecha por proximidad de fecha límite (umbrales 3/10 días). Reusado en la card y en `/planeacion`. |
| `src/lib/fases.ts` | `agruparPorFase(filas)` — agrupa filas planas de `requirement_tasks` en el shape `Fase[]` que consume `FaseStepper`. |
| `src/lib/planeacion-data.ts` | `getPlaneacionData()` — consulta requerimientos con `has_detail_tracking` + sus tareas, arma el shape que consume `/planeacion`. |
| `src/lib/kpis.ts` | `getKPIs()`, `getCalidadDatos()` — puramente sobre el array de `Requerimiento[]` ya adaptado, sin tocar Supabase directamente. |
| `src/lib/dashboard-data.ts` | `getDashboardData()` — consulta `requirements` por `project_id`, adapta cada fila DB → `Requerimiento` (mismo shape de siempre), con caché in-memory del último resultado bueno si Supabase no responde. Único punto de entrada que usa `src/app/page.tsx`. |
| `src/lib/types.ts` | Tipos compartidos (`Requerimiento`, `Fase`, `Tarea`, `KPIs`, `CalidadDatos`, etc.). `Requerimiento` ganó `semaforo: Semaforo`; perdió `hojaDetalle` (concepto específico de Excel, ya no aplica). |
| `src/lib/icons.tsx` | `RequerimientoIcono` (componente, no una función que devuelve un componente — así lo exige la regla `react-hooks/static-components` de eslint) que mapea el ícono por patrón en el nombre del requerimiento. |
| `src/app/page.tsx` | Server Component: llama `getDashboardData()`, muestra solo el banner de error si no hay ningún dato previo bueno. |
| `src/app/planeacion/page.tsx` + `src/components/planeacion/*` | Vista Gantt: `gantt-sidebar.tsx` (colapsable desktop + drawer mobile vía `Sheet`), `gantt-timeline.tsx` (grid CSS por día, sin librería externa), `planeacion-client.tsx` (orquestador). |
| `src/components/dashboard-client.tsx` | KPIs, búsqueda/filtros, los 4 bloques de estado, botón Exportar PDF, atenúa el dashboard si `error` es `true`. **Ya no tiene botón "Sincronizar"** (se retiró — ver "Fuente de datos"). |
| `src/components/requerimiento-card.tsx` | Card individual ampliada (~176px, badge de mes, fila horas/fecha, dot de semáforo junto a la fecha) (RN-04). El semáforo **convive** con el borde de "bloqueado" (RN-03) — son dos señales distintas, no se reemplazan entre sí. |
| `src/components/kpi-strip.tsx` | 5 KPIs, el 5º ("Calidad de datos") con acento `"atencion"` (azul pizarra, no ámbar) y link a `#calidad-datos`. |
| `src/components/data-quality-panel.tsx` | Panel colapsable de calidad de datos — **solo evalúa los 7 requerimientos con hoja de detalle real**, nunca los 21 heurísticos. |
| `src/components/archivo-bloqueado-banner.tsx` | Banner de error + botón Reintentar (llama a `reintentar()`, solo hace `refresh()` — no confundir con el antiguo botón "Sincronizar", que ya no existe), usado standalone (sin datos previos) o embebido en `dashboard-client.tsx` (con datos previos atenuados). |
| `src/components/pdf-report.tsx` | Reporte para impresión (`hidden print:block`), incluye los 28 requerimientos, sin el panel de calidad, sin numeración de página. |
| `src/components/fase-stepper.tsx` | Línea de tiempo vertical de fases en el drill-down. |
| `src/app/requerimiento/[item]/page.tsx` | Página de drill-down por requerimiento (RN-04/05). Consulta `requirements`+`requirement_tasks` en Supabase por `slug`; envuelto en try/catch propio → `<ArchivoBloqueadoBanner soloBanner />` si falla. |
| `src/app/actions.ts` | Server Action `reintentar()` (`refresh()`) — usada solo por el banner de error. |
| `public/fonts/montserrat-{400,500,600,700}.woff2` | Montserrat auto-hospedada (no `next/font/google`) — cargada vía `next/font/local` en `layout.tsx`. |

`src/lib/excel/*` (workbook/dashboard-sheet/detalle-sheet) y la dependencia
`xlsx` se **borraron** en la Fase A, una vez verificada la migración — ya
no hay ningún consumidor de ese código.

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
- **RN-05** (sync manual, sin polling): **superada desde la Fase A** — ya
  no hay una fuente externa (Excel/Drive) que sincronizar manualmente; cada
  carga de página consulta Supabase directamente, sin caché ni polling. El
  botón "Sincronizar" se retiró (decisión explícita del PO al ejecutar la
  Fase A).
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

Fases previas a la migración a Supabase (todas ✅ completas, era-Excel —
detalle completo en el plan histórico referenciado al final de esta
sección, no se repite aquí porque el Excel ya no es parte de la app):
**Fase 0** (reorganización inicial del Excel), **Fase 0.1** (auditoría/
estandarización de las 7 hojas de detalle), **Fase 1** (MVP local),
**Fase 2** (marca Positiva + calidad de datos + PDF + resiliencia),
**punto de control MVP** (2026-08-01, nivelación de git/documentación/
arquitectura antes de seguir), **Fase 3a** (Google Drive como fuente de
datos temporal, previa a Supabase).

**A partir de aquí, el PO revirtió explícitamente la decisión de "sin BD,
sin caché, sin multi-proyecto" de la antigua Fase 5 (ver planes abajo,
conservados como historial) y pidió una migración real a Supabase.** Las
Fases 3 (Acceso)/4 (Datos más completos)/5 (Escala) que seguían aquí quedan
**superadas** por el nuevo roadmap — no se ejecutan tal como estaban
planteadas:
- El login de la vieja "Fase 3" (Auth.js + Google, sin roles) fue
  reemplazado por **Fase B** del nuevo roadmap: Supabase Auth nativo, con
  roles Admin/Viewer.
- La vieja "Fase 4" (Gantt) ya se ejecutó como parte de la nueva **Fase A**
  (`/planeacion`, ver Fuente de datos arriba).
- La vieja "Fase 5" (decisión de no usar BD) fue **revertida por el PO**:
  ya hay base de datos, y el modelo soporta multi-proyecto (aunque sin
  selector en la UI todavía, ver Fuente de datos arriba).

- **Fase A — Migración a Supabase (multi-proyecto, solo lectura), semáforo,
  Gantt:** ✅ completa (2026-08-06). Ver "Estado actual" y "Fuente de datos"
  arriba para el resumen; diseño completo, decisiones tomadas con el PO
  (más de 30 preguntas de descubrimiento) y detalle campo a campo de la
  migración en `ROADMAP_SUPABASE.md` (historial).
- **Fase 0 — Fundaciones (migraciones versionadas, tipos generados, CI,
  backup, andamiaje compartido):** pendiente, bloqueante para B/C/D. Diseño
  completo en `ROADMAP_V2.md`.
- **Fase B — Supabase Auth + roles (Admin/Viewer):** pendiente. Diseño
  completo en `ROADMAP_V2.md`.
- **Fase C — Pantallas de escritura (CRUD):** pendiente. Diseño completo en
  `ROADMAP_V2.md`.
- **Fase D — Documentos versionados (sin versionado real: subir reemplaza y
  borra el anterior):** pendiente. Diseño completo en `ROADMAP_V2.md`.

Plan detallado de las Fases 0 a 3a (historial, fuera de este repo, contexto
completo de las decisiones tomadas con el PO — Fase 0, Fase 2 rediseñada, y
el punto de control MVP):
`.claude/plans/c-users-usuario-1-documents-tablero-req-lively-russell.md`.
Plan detallado de la Fase A: `ROADMAP_SUPABASE.md` (en la raíz de este
repo) — queda como historial, **superado**. Plan detallado de la Fase 0 en
adelante: `ROADMAP_V2.md` (en la raíz de este repo) — es la fuente de
verdad vigente para todo lo que sigue; incluye la tabla de 14 puntos donde
`ROADMAP_SUPABASE.md` contradice lo que hay en disco.
