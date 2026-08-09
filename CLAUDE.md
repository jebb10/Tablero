@AGENTS.md

# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo que muestra el estado de los requerimientos del proyecto
Positiva Web 414: en qué estado va cada uno, horas consumidas vs. estimadas, y
el detalle de tareas por fase al hacer drill-down. Este es un proyecto **vivo,
construido por fases** — no asumas que la fase actual es la versión final;
consulta siempre "Estado actual" abajo antes de proponer cambios grandes.

## Estado actual: Fase 0 completa; Fase B en curso (Unidades B.1-B.4 completas)

- Desplegado en Vercel: [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)
  (repo: `https://github.com/jebb10/Tablero.git`). **RLS ya exige sesión
  para leer datos** desde la Unidad B.4 (2026-08-09): la anon key pública
  del bundle del navegador ya no puede leer `projects`/`requirements`/
  `requirement_tasks` por PostgREST. Desde la Unidad B.3 **ya existe
  `/login` real**: login, logout, recuperar/restablecer contraseña
  completos, y `src/proxy.ts` redirige a `/login` cualquier ruta sin
  sesión. Falta B.5 (RoleGate) y B.6 (verificación de seguridad + cierre
  de documentación).
- **El flujo completo de recuperar/restablecer contraseña ya se probó en
  vivo con éxito (confirmado por el PO, 2026-08-09)**: pedir el correo,
  llegar el enlace, aterrizar en `/login/restablecer` y definir la nueva
  contraseña funcionó de punta a punta. El límite de envíos del SMTP por
  defecto de Supabase (sin SMTP propio) ya no bloquea esta verificación,
  pero **sigue sin configurarse un SMTP propio** — a vigilar si el volumen
  de envíos crece (hoy son 1 Admin + pocos Viewers, riesgo bajo). También
  sigue pendiente agregar `https://tablero-pi.vercel.app/auth/callback` a
  la lista de Redirect URLs de Supabase (Authentication → URL
  Configuration) — hoy solo está whitelisteado el de `localhost`;
  verificar si el flujo probado en producción ya pasó por ahí o si usó
  localhost.
- **El sistema de diseño de Claude Design para B.3 (login) y B.5
  (RoleGate) ya llegó e integró** — ver `design/` en la raíz del repo y
  los tokens nuevos en `src/app/globals.css` (`--surface-muted`,
  `--success`, `--destructive-text`, `--warning-bg`/`--warning-text`,
  `--primary-hover`/`--primary-disabled`). **Además, el 2026-08-09
  llegaron 3 maquetas nuevas de Fase C** (home, Gantt, detalle de
  requerimiento) — ver la tabla "Diseños de Claude Design entregados" en
  `ROADMAP_V2.md` para el mapeo exacto a cada unidad pendiente.
- **A partir de la Fase B, el flujo de git cambió**: rama + PR (autoaprobado
  por el PO) en vez de push directo a `origin/main` como en toda la Fase 0.
  Vercel no tiene previews por PR — la verificación real en producción solo
  ocurre después de mergear.
- El PO decidió revertir la decisión de "sin BD, sin multi-proyecto" de la
  antigua Fase 5 (ver más abajo) para convertir esto en una aplicación real:
  multi-proyecto, con login por roles y escritura. La migración a Supabase
  (Fase A del nuevo roadmap) y la Fase 0 (fundaciones: migraciones
  versionadas, tipos generados, CI, backup, andamiaje compartido — ver más
  abajo) ya están completas; faltan Fase B (auth/roles), Fase C (pantallas
  de escritura) y Fase D (documentos versionados) — ver `ROADMAP_V2.md`
  para el diseño vigente completo y las decisiones tomadas
  (`ROADMAP_SUPABASE.md` queda como historial, superado).
- Lee de un proyecto Supabase (Postgres + API REST), ver "Fuente de datos"
  abajo. **El Google Sheet / `.xlsx` que se usaba antes de la Fase A ya no
  existe** — el archivo (`legado/REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx`)
  se borró físicamente el 2026-08-06, una vez verificada la migración. No
  es fuente de datos, no requiere mantenimiento, y no hace falta seguir
  pensando en él (el gotcha de fórmulas sin recalcular, las hojas ocultas,
  etc. son historia, no tareas pendientes).
- **Backup (Unidad 0.5): completo y verificado (2026-08-09).** Ver sección
  "Backup" abajo.
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
  a `ROADMAP_SUPABASE.md`): el resto de la Fase B (B.5 RoleGate, B.6
  verificación de seguridad y cierre de documentación), Fase C (pantallas
  de escritura — la UI espera componentes sincronizados desde el sistema
  de diseño del PO en claude.ai/design; el de B.3/B.5 ya llegó, el resto
  de Fase C sigue pendiente), Fase D (documentos versionados en Storage).
  Fase 0 (fundaciones) ya está completa.

## Fuente de datos

La fuente de datos es un proyecto Supabase (Postgres + API REST vía
`@supabase/supabase-js`, cliente `anon`/`publishable`).
`src/lib/supabase/server.ts` crea el cliente; `src/lib/dashboard-data.ts` y
`src/app/requerimiento/[item]/page.tsx` hacen las consultas. El proyecto
activo es un default hardcodeado (`positiva-web-414`) en `src/lib/project.ts`
— no hay selector de proyecto en la UI todavía porque solo existe un
proyecto real (el modelo de datos ya soporta multi-proyecto).

**`SUPABASE_URL`/`SUPABASE_ANON_KEY` están hardcodeadas como constantes en
`src/lib/supabase/server.ts`, NO como env vars** — mismo patrón que el
antiguo `SHEET_ID` de la Fase 3a. Se intentó vía env vars de Vercel primero
y sí requería plan de pago. Sin problema de seguridad nuevo: la `anon`/
`publishable` key está diseñada para el navegador, protegida por RLS, no
por mantenerla en secreto. Si el proyecto Supabase cambia, hay que editar
esas constantes en código y hacer deploy — no hay forma de cambiarlo sin
tocar código. La `secret key` (equivalente a `service_role`) **nunca** vive
en el código — solo se usó localmente (`.env.local`, gitignored) para
correr `scripts/migrate_to_supabase.py`.

Esquema completo (DDL) versionado en `supabase/migrations/` (aplicado vía
`npm run db:push`, CLI de Supabase — ver `supabase/MIGRACIONES.md`) — tablas
`projects`, `requirements`, `requirement_tasks`, `activity_logs` (vacía,
forward-looking para Fase C), `document_versions` (vacía, forward-looking
para Fase D). **RLS exige sesión desde la Unidad B.4** (2026-08-09):
`projects`/`requirements`/`requirement_tasks` solo son legibles con
`auth.uid()` válido (`to authenticated`); escribir en `requirements`/
`requirement_tasks` exige además `public.is_admin()`. `activity_logs` y
`document_versions` siguen sin policies (Fase C/D). El DDL original de la
Fase A (`supabase/schema.sql`) quedó archivado en
`supabase/legado/schema-fase-a.sql` ("HISTÓRICO. No ejecutar") una vez
migrado a migraciones versionadas en la Unidad 0.1.

Los datos se migraron una sola vez con `scripts/migrate_to_supabase.py`
(Python + openpyxl + `supabase-py`, idempotente vía upsert) — el detalle
campo a campo de esa migración (qué hoja mapeaba a qué columna, etc.) ya no
vive en ningún documento vigente (se recortó de `ROADMAP_SUPABASE.md` el
2026-08-09 por ser historia ya ejecutada); sigue disponible en el historial
de git de ese archivo si algún día hiciera falta. No hay polling ni
caché de servidor más allá de una caché in-memory del último resultado
bueno (para resiliencia si Supabase no responde en un request puntual) — el
botón "Sincronizar" (RN-05, tenía sentido solo cuando la fuente era externa)
se **retiró por completo**: ya no hay nada que sincronizar manualmente,
Next.js sirve datos frescos en cada carga de página. El banner de error
sigue existiendo (`error-datos-banner.tsx`) con un botón "Reintentar"
que solo fuerza un refresh de la página (`reintentar()` en `actions.ts`).

**Este proyecto lee y (a partir de Fase C) escribirá en Supabase.** No hay
ninguna fuente de datos externa (Excel/Sheet/Drive) en este flujo — quedó
retirada por completo en la Fase A.

**Supabase también quedó asociado al repo de GitHub** (integración nativa
de Supabase con el repositorio) — verificar en el momento si eso implica un
flujo de migraciones/branching que el equipo deba seguir (ej. cambios de
esquema vía PR en vez de directamente en el SQL Editor), no asumido todavía
en este documento.

## Backup

Backup diario de Supabase vía GitHub Actions (`.github/workflows/backup.yml`,
cron `0 7 * * *` = 02:00 Bogotá + `workflow_dispatch` manual): dos dumps
(`schema.sql`, `data.sql`) con `supabase db dump`, subidos como artifact con
retención de 90 días. Complemento no automatizado: copia mensual manual del
PO a OneDrive (única protección contra pérdida de la cuenta de GitHub).
Procedimiento completo de restauración y bitácora de ensayos en
`supabase/RUNBOOK_BACKUP.md` — no repetido aquí.

**Riesgo a vigilar activamente**: GitHub deshabilita automáticamente los
workflows programados (`cron`) en repos sin actividad (sin push/commit) por
60+ días. Si al retomar este proyecto han pasado 60+ días desde el último
commit, **antes de asumir que el backup diario sigue corriendo**: entrar a
la pestaña Actions del repo y disparar `workflow_dispatch` en `backup.yml`
manualmente para reactivar el cron, y confirmar que el run termina en verde.

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
  REST). **`@supabase/ssr`** (Unidad B.1) maneja las cookies de sesión SSR —
  `src/lib/supabase/server.ts` crea el cliente `anon` para Server
  Components/data-loaders, `src/lib/supabase/proxy-client.ts` el usado por
  `src/proxy.ts`.
- **`lucide-react`** para íconos (mapeo por palabra clave en
  `src/lib/icons.tsx`).
- Base de datos real (Supabase/Postgres) desde la Fase A. **Autenticación
  real desde la Unidad B.3**: Supabase Auth con `/login`, logout,
  recuperar/restablecer contraseña, y `src/proxy.ts` exigiendo sesión en
  toda ruta no pública. Roles Admin/Viewer existen (tabla `profiles`,
  Unidad B.2); en RLS ya distinguen (Unidad B.4: solo Admin puede
  escribir), pero en la UI siguen siendo solo informativos (`RoleBadge`) —
  ocultar controles de escritura por rol es la Unidad B.5, ver
  `ROADMAP_V2.md`.
- **Control de versiones**: repo git local, rama `master` (tracking
  `origin/main`), remoto `https://github.com/jebb10/Tablero.git`. Un solo
  commit con todo el historial real del proyecto (el commit inicial de
  `create-next-app` y el placeholder que traía el repo remoto quedaron
  reemplazados con confirmación explícita del PO — ver punto de control MVP).

### Archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `supabase/migrations/` | DDL versionado (tablas, RLS, seed del proyecto), aplicado vía `npm run db:push` (CLI de Supabase). El DDL original de la Fase A quedó archivado en `supabase/legado/schema-fase-a.sql` ("HISTÓRICO. No ejecutar"). |
| `scripts/migrate_to_supabase.py` | Script one-time (admin-run) que migró el `.xlsx` legado a Supabase vía `supabase-py`. Idempotente (upsert), reporte de verificación al final. No se vuelve a correr salvo que haya que re-migrar desde cero (`--reset`) — inejecutable hoy de todas formas, el `.xlsx` fuente ya no existe. |
| `scripts/create_user.mjs` | Script admin-run (Unidad B.2) para crear/actualizar usuarios: `auth.admin.createUser` + upsert en `profiles`, idempotente por email. Lee `SUPABASE_SECRET_KEY` de entorno, nunca del código. Único flujo soportado para altas de usuario — evita el estado roto de un usuario en `auth.users` sin fila en `profiles`. |
| `src/lib/supabase/server.ts` | `getSupabaseClient()` (async, Unidad B.1) — cliente `anon` de `@supabase/ssr` (`createServerClient`) con cookies de sesión vía `cookies()` de `next/headers`. Usado por Server Components/data-loaders. |
| `src/lib/supabase/config.ts` | `SUPABASE_URL`/`SUPABASE_ANON_KEY` hardcodeadas (Unidad B.1, antes vivían en `server.ts`) — mismo motivo que el antiguo `SHEET_ID`, ver "Fuente de datos". |
| `src/lib/supabase/proxy-client.ts` | `createProxyClient(request)` (Unidad B.1) — cliente que lee/escribe cookies vía `NextRequest`/`NextResponse`, usado únicamente por `src/proxy.ts`. |
| `src/proxy.ts` | Proxy de Next 16.2 (Unidad B.1, reemplaza a `middleware.ts`) — desde la Unidad B.3, exige sesión: si `auth.getUser()` no devuelve usuario y la ruta no es pública (`/login*`, `/auth*`), redirige a `/login?next=<ruta>` (protección optimista; la RLS pública sigue siendo el respaldo real hasta B.4). Matcher excluye `_next/static`/`_next/image`/`favicon.ico`/imágenes/fuentes. |
| `src/lib/auth/session.ts` | `getCurrentProfile()` (Unidad B.3, memoizado con `cache()`) — valida el usuario contra Supabase Auth y lee su `role`/`full_name` de `profiles`; sin fila en `profiles` = no autorizado. `requireAuth()`/`requireAdmin()` existen como helpers para Fase C, sin consumidores todavía. |
| `src/app/login/page.tsx` + `src/app/login/actions.ts` | Página de login (Server Component) + Server Actions `loginAction()`/`cerrarSesion()` (Unidad B.3) — `signInWithPassword`/`signOut` de Supabase Auth, con `rutaSegura()` para evitar open-redirect vía `?next=`. |
| `src/app/login/recuperar/*` + `src/app/login/restablecer/*` | Flujo de recuperar/restablecer contraseña (Unidad B.3) — **pendiente probar en vivo por el PO**, ver "Estado actual". |
| `src/app/auth/callback/route.ts` | Route Handler (Unidad B.3) que intercambia el código PKCE del correo de recuperación por una sesión real. |
| `src/components/auth/login-form.tsx`, `recuperar-form.tsx`, `restablecer-form.tsx` | Formularios cliente (Unidad B.3) sobre `useActionState`, con componentes shadcn/ui (`Alert`, `Button`, `Input`, `Label`, `Spinner`) + tokens del sistema de diseño de Claude Design. |
| `src/components/auth/role-badge.tsx` | `RoleBadge` (Unidad B.3) — badge visual Admin/Viewer en el nav de `layout.tsx`; puramente informativo, no condiciona renderizado (eso es la Unidad B.5). |
| `src/lib/supabase/database.types.ts` | Tipos generados vía `npm run types:db` (CLI de Supabase) — usado por los tres módulos `src/lib/*-data.ts` para tipar las consultas sin `as`. |
| `src/lib/project.ts` | `PROJECT_SLUG` — default hardcodeado del único proyecto sembrado (`positiva-web-414`). |
| `src/lib/estados.ts` | Fuente única de estados: `ESTADOS_DB`, `ESTADO_DB_A_ES`/`ESTADO_ES_A_DB`, `dbAEstado()` (con `console.warn` para valores no mapeados). Sustituye el `Record` de 4 claves que antes vivía inline en `dashboard-data.ts`. |
| `src/lib/slug.ts` | `slugify()` — port TS del de `scripts/migrate_to_supabase.py`, verificado contra los 28 códigos reales en `src/lib/__tests__/slug.fixtures.json`. |
| `src/lib/fases-orden.ts` | `FASES_ORDEN` — antes duplicado en `fases.ts` y `planeacion-data.ts`. |
| `src/lib/fechas.ts` | `hoyLocal()`/`aISO()`/`desdeISO()`/`sumarDias()`/`diffDias()` en zona `America/Bogota`. Sin consumidores todavía (se usa a partir de la Unidad C1.4). |
| `src/lib/semaforo.ts` | `calcularSemaforo(deadline)` — rojo/ámbar/verde/sin-fecha por proximidad de fecha límite (umbrales 3/10 días). Reusado en la card y en `/planeacion`. |
| `src/lib/fases.ts` | `agruparPorFase(filas)` — agrupa filas planas de `requirement_tasks` en el shape `Fase[]` que consume `FaseStepper`. |
| `src/lib/planeacion-data.ts` | `getPlaneacionData()` — consulta requerimientos con `has_detail_tracking` + sus tareas, arma el shape que consume `/planeacion`. |
| `src/lib/kpis.ts` | `getKPIs()`, `getCalidadDatos()` — puramente sobre el array de `Requerimiento[]` ya adaptado, sin tocar Supabase directamente. |
| `src/lib/dashboard-data.ts` | `getDashboardData()` — consulta `requirements` por `project_id`, adapta cada fila DB → `Requerimiento` (mismo shape de siempre), con caché in-memory del último resultado bueno si Supabase no responde. Único punto de entrada que usa `src/app/page.tsx`. |
| `src/lib/requerimiento-data.ts` | `getRequerimientoDetalle(slug)` — consulta `requirements`+`requirement_tasks` en Supabase por `slug`, con su propio try/catch. Único punto de entrada del drill-down, usado por `src/app/requerimiento/[item]/page.tsx`. |
| `src/lib/types.ts` | Tipos compartidos (`Requerimiento`, `Fase`, `Tarea`, `KPIs`, `CalidadDatos`, etc.). `Requerimiento` ganó `semaforo: Semaforo`; perdió `hojaDetalle` (concepto específico de Excel, ya no aplica). |
| `src/lib/icons.tsx` | `RequerimientoIcono` (componente, no una función que devuelve un componente — así lo exige la regla `react-hooks/static-components` de eslint) que mapea el ícono por patrón en el nombre del requerimiento. |
| `src/app/page.tsx` | Server Component: llama `getDashboardData()`, muestra solo el banner de error si no hay ningún dato previo bueno. |
| `src/app/planeacion/page.tsx` + `src/components/planeacion/*` | Vista Gantt: `gantt-sidebar.tsx` (colapsable desktop + drawer mobile vía `Sheet`), `gantt-timeline.tsx` (grid CSS por día, sin librería externa), `planeacion-client.tsx` (orquestador). |
| `src/components/dashboard-client.tsx` | KPIs, búsqueda/filtros, los 4 bloques de estado, botón Exportar PDF, atenúa el dashboard si `error` es `true`. **Ya no tiene botón "Sincronizar"** (se retiró — ver "Fuente de datos"). |
| `src/components/requerimiento-card.tsx` | Card individual ampliada (~176px, badge de mes, fila horas/fecha, dot de semáforo junto a la fecha) (RN-04). El semáforo **convive** con el borde de "bloqueado" (RN-03) — son dos señales distintas, no se reemplazan entre sí. |
| `src/components/kpi-strip.tsx` | 5 KPIs, el 5º ("Calidad de datos") con acento `"atencion"` (azul pizarra, no ámbar) y link a `#calidad-datos`. |
| `src/components/data-quality-panel.tsx` | Panel colapsable de calidad de datos — **solo evalúa los 7 requerimientos con hoja de detalle real**, nunca los 21 heurísticos. |
| `src/components/error-datos-banner.tsx` | `ErrorDatosBanner` — Banner de error + botón Reintentar (llama a `reintentar()`, solo hace `refresh()` — no confundir con el antiguo botón "Sincronizar", que ya no existe), usado standalone (sin datos previos) o embebido en `dashboard-client.tsx` (con datos previos atenuados). |
| `src/components/pdf-report.tsx` | Reporte para impresión (`hidden print:block`), incluye los 28 requerimientos, sin el panel de calidad, sin numeración de página. |
| `src/components/fase-stepper.tsx` | Línea de tiempo vertical de fases en el drill-down. |
| `src/app/requerimiento/[item]/page.tsx` | Página de drill-down por requerimiento (RN-04/05). Llama a `getRequerimientoDetalle(slug)` (`src/lib/requerimiento-data.ts`) → `<ErrorDatosBanner soloBanner />` si falla. |
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

Fases previas a la migración a Supabase (todas ✅ completas, era-Excel — no
se repite el detalle aquí porque el Excel ya no es parte de la app):
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
  arriba para el resumen; decisiones tomadas con el PO (más de 30 preguntas
  de descubrimiento) y resumen ejecutivo del cierre en `ROADMAP_SUPABASE.md`
  (historial, recortado el 2026-08-09).
- **Fase 0 — Fundaciones:** ✅ **completa** (2026-08-09). Unidades 0.0–0.4
  completadas 2026-08-07; Unidad 0.6 (andamiaje compartido: `slug.ts`,
  `estados.ts`, `fechas.ts`, `fases-orden.ts`, `zod`) y Unidad 0.5 (backup,
  con ensayo de restauración real verificado) completadas 2026-08-09. Diseño
  completo en `ROADMAP_V2.md`. Siguiente: Fase B (Auth).
- **Fase B — Supabase Auth + roles (Admin/Viewer):** en curso. Unidades
  B.1–B.4 ✅ completas — detalle de cada una (fechas, verificación en vivo,
  hallazgos) archivado en `ROADMAP_HISTORIAL.md` para no inflar este
  documento. Resumen: clientes SSR + `proxy.ts` (B.1), `profiles` +
  `is_admin()` + usuarios reales (B.2), `/login` + logout + recuperar/
  restablecer contraseña (B.3, alcance ampliado respecto al diseño
  original — ver historial), flip de RLS a solo-autenticados (B.4,
  2026-08-09: `projects`/`requirements`/`requirement_tasks` ya no son
  legibles con la anon key, trigger `updated_at` activado). Pendientes
  reales antes de dar B.3 por 100% verificada: SMTP propio en Supabase,
  redirect URL de `/auth/callback` en producción, y probar en vivo el
  flujo de recuperar contraseña. Faltan B.5 (RoleGate) y B.6 (verificación
  de seguridad + cierre de documentación) — diseño completo en
  `ROADMAP_V2.md`. Desde la Unidad B.1, Fase B usa rama + PR (no push
  directo a `main`).
- **Fase C — Pantallas de escritura (CRUD):** pendiente. Diseño completo en
  `ROADMAP_V2.md`.
- **Fase D — Documentos versionados (sin versionado real: subir reemplaza y
  borra el anterior):** pendiente. Diseño completo en `ROADMAP_V2.md`.

Resumen ejecutivo de la Fase A: `ROADMAP_SUPABASE.md` (en la raíz de este
repo) — queda como historial, **superado**. Diseño vigente de lo que falta
(B.4 en adelante): `ROADMAP_V2.md` (en la raíz de este repo) — se mantiene
liviano a propósito, solo con el diseño de unidades pendientes; incluye la
tabla de 14 puntos donde `ROADMAP_SUPABASE.md` contradice lo que hay en
disco. **Bitácora completa de todas las unidades ya cerradas (0.0–0.6, Fase
A, B.1–B.3): `ROADMAP_HISTORIAL.md`** — solo hace falta abrirlo si se
necesita el detalle exacto de cómo se ejecutó algo ya hecho, no para seguir
trabajando.
