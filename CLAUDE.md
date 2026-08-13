@AGENTS.md

# Positiva — Seguimiento de Requerimientos

Dashboard ejecutivo de seguimiento de requerimientos de un proyecto de
software: en qué estado va cada uno, horas consumidas vs. estimadas (a nivel
de requerimiento y por fase), y el detalle de tareas por fase al hacer
drill-down. Es una herramienta genérica de seguimiento de proyectos — no está
acoplada a ningún cliente o dominio de negocio particular. Este es un
proyecto **vivo, construido por fases** — no asumas que la fase actual es la
versión final; consulta siempre "Estado actual" abajo antes de proponer
cambios grandes.

## Estado actual: Fases 0, B, C, C1 y C2 completas y verificadas — sin trabajo pendiente del roadmap

- Desplegado en Vercel: [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)
  (repo: `https://github.com/jebb10/Tablero.git`). Login real por roles
  (Admin/Viewer) vía Supabase Auth, con recuperar/restablecer contraseña
  verificado en producción. **RLS exige sesión para leer y solo Admin para
  escribir** (`projects`/`requirements`/`requirement_tasks`); la UI también
  oculta controles solo-Admin a los Viewers vía `RoleGate`
  (`src/components/auth/role-gate.tsx`), no solo la RLS. Checklist de
  seguridad de 11 puntos corrido contra producción, evidencia en
  `supabase/RUNBOOK_AUTH.md`. **Sigue sin configurarse un SMTP propio** —
  pospuesto explícitamente por el PO (riesgo bajo hoy, con 1 Admin + pocos
  Viewers).
- El sistema de diseño de Claude Design (`design/` en la raíz del repo) ya
  integró: login, `RoleGate`, home, Gantt, detalle de requerimiento —
  tokens en `src/app/globals.css`.
- **Flujo de git**: rama + PR (autoaprobado por el PO), no push directo a
  `origin/main`. Vercel no tiene previews por PR — la verificación real en
  producción ocurre después de mergear.
- Cubre: vista principal (Home) con KPIs, búsqueda/filtros, 4 bloques de
  estado y semáforo por fecha límite; drill-down por requerimiento con
  acordeón de tareas por fase (edición de tareas/fechas incluida — pantalla
  única, ver más abajo); vista `/planeacion` (Gantt navegable con sidebar
  colapsable), con un botón "Detalle" por requerimiento que navega al
  drill-down. Horas ejecutadas editables directamente por tarea; horas
  estimadas manuales por fase (ver el punto de 2026-08-12 más abajo).
- Lee y escribe en Supabase (Postgres + API REST), ver "Fuente de datos"
  abajo. **Backup diario verificado** — ver "Backup" abajo.
- **Todas las fases planificadas (0, B, C, C1, C2) están completas y
  verificadas en producción — no hay trabajo pendiente del roadmap.** El
  detalle de ejecución de cada una (decisiones tomadas con el PO, pivots de
  diseño, PRs #9–#20) vive en el historial de git — no se conserva como
  documento aparte en el repo. Ninguna fase de documentos versionados
  (antes "Fase D") sigue en pie ni como diseño futuro — se descartó por
  completo. **Refinamiento visual pantalla por pantalla en curso desde el
  2026-08-11 (fuera del roadmap de fases, ciclo continuo pedido por el
  PO)**: Home refinada (PR #19/#24), Detalle del requerimiento refinado
  (PR #25, 2026-08-12) y modelo de horas + encabezado de fase rediseñado
  (PR #26, 2026-08-12) — ver los dos puntos siguientes. Pendiente:
  Planeación/Gantt.
- **Responsive mobile (PR #28, 2026-08-12)**: Home y Detalle del
  requerimiento se apilan en viewports angostos (verificado a 412px de
  ancho) en vez de comprimirse — nav sin nombre de usuario visible por
  debajo de `sm`, header de Home en columna, grid de tarjetas a 1 columna
  bajo `sm`, KPI strip como grid 2/3/5 columnas, tarjetas de horas del
  Detalle apiladas bajo `sm`, y el bloque de fecha límite de fase +
  "Añadir tarea" a ancho completo en su propia fila. El layout de
  escritorio no cambió. Planeación/Gantt no se tocó — sigue sin
  refinamiento visual, mobile incluido.
- **Autoscroll a "En curso", pantalla `/horas` y renombrado del proyecto
  (PR #29, 2026-08-13, pedido por el PO)**: el KPI "En curso" del Home
  hace scroll suave hasta su sección (ancla `#en-curso` en el `<section>`
  de `dashboard-client.tsx` + `scroll-behavior: smooth` en
  `globals.css`). El KPI "Horas ejecutadas / estimadas" navega a `/horas`
  (pantalla nueva, independiente, no modal): reporte por requerimiento de
  horas estimadas de las fases Requerimientos/Diseño/Desarrollo (1/2/3 de
  `FASES_ORDEN` — QA y Producción se ignoran a propósito ahí), su suma, y
  el total de horas ejecutadas real (todas las fases, coincide con el KPI
  del Home); agrupado por estado igual que el Home, exportable a PDF con
  el mismo mecanismo ya existente (`window.print()` + `hidden
  print:block`). Además, se retiró "Dashboard 414" de todo texto visible
  (nav, pestaña del navegador, títulos/pies de los PDF exportados) — el
  nombre visible del proyecto es ahora simplemente **"Positiva"**;
  `PROJECT_SLUG` (`"positiva-web-414"`, identificador interno de
  Supabase) y los nombres de archivo/función internos (`DashboardClient`,
  `getDashboardData`, etc.) se dejaron intactos a propósito — no son texto
  visible.
- **Nota de entorno (2026-08-13)**: el desarrollo local vive dentro de una
  carpeta sincronizada por OneDrive (`Documents/...`), que inyecta un
  `desktop.ini` en **cada** carpeta del repo, incluyendo dentro de
  `.next/` y de `.git/refs/`. Esto rompía dos cosas: (1) el caché
  persistente de Turbopack en dev crasheaba el servidor con
  `Failed to open database ... invalid digit found in string` — se
  desactivó con `experimental.turbopackFileSystemCacheForDev: false` en
  `next.config.ts` (solo afecta velocidad de recompilación entre
  reinicios, no el comportamiento de la app); (2) `git fetch`/`pull`
  fallaban con `fatal: bad object refs/desktop.ini` — se resuelve
  borrando todos los `desktop.ini` dentro de `.git/` (`find .git -iname
  desktop.ini -delete`), OneDrive los puede volver a crear con el tiempo,
  así que si un `git fetch` falla así de nuevo, repetir esa limpieza antes
  de sospechar de otra causa.
- **Detalle del requerimiento (`/requerimiento/[item]`) es ahora la única
  pantalla de edición de tareas/fechas** — la antigua
  `/planeacion/[requerimiento]/editar` se eliminó (2026-08-12, PR #25) al
  confirmarse que era un subconjunto casi vacío del mismo componente
  `TareasPorFase`. Desde Planeación, el botón "Detalle" navega directo al
  drill-down (sin `requireAdmin()` bloqueante — mismo patrón de acceso que
  ya tenía Detalle: `RoleGate` oculta controles de edición, cualquier
  usuario autenticado puede ver la pantalla). El link del ambiente de
  desarrollo vive en el header de Detalle, junto al título.
- **Rediseño del modelo de horas y del encabezado de fase (PR #26,
  2026-08-12, pedido por el PO)**: se eliminó por completo la bitácora
  `activity_logs` (y el bloque "Actividades sin fase asignada") — "horas
  ejecutadas" pasó a ser un campo editable directamente por tarea
  (`requirement_tasks.executed_hours`, mantenido por la aplicación, no por
  trigger); `requirements.executed_hours` se recalcula en la Server Action
  al editar/crear/eliminar una tarea. "Horas estimadas" dejó de calcularse
  sumando tareas: ahora es un dato manual **por fase**
  (`requirement_phase_deadlines.estimated_hours`), diligenciado al
  crear/editar el requerimiento (opcional, no bloqueante frente al total).
  El encabezado de cada fase en `TareasPorFase` quedó rediseñado: chip de
  estado junto al título, "N/M completadas · Fase límite: fecha" en su
  línea, horas Estimadas/Consumidas en la suya (Consumidas en rojo si hay
  sobrepresupuesto), y a la derecha dos filas alineadas por su borde
  izquierdo — fecha límite de fase + chevron de expandir arriba, "Guardar"
  + "Añadir tarea" abajo.

## Fuente de datos

La fuente de datos es un proyecto Supabase (Postgres + API REST vía
`@supabase/supabase-js`, cliente `anon`/`publishable`).
`src/lib/supabase/server.ts` crea el cliente; `src/lib/dashboard-data.ts` y
`src/app/requerimiento/[item]/page.tsx` hacen las consultas. El proyecto
activo es un slug hardcodeado en `src/lib/project.ts` (`PROJECT_SLUG`,
el único proyecto real sembrado en la tabla `projects`) — no hay selector de
proyecto en la UI todavía porque solo existe un proyecto real (el modelo de
datos ya soporta multi-proyecto).

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
`projects`, `requirements`, `requirement_tasks`,
`requirement_phase_deadlines` (una fila por requerimiento+fase: fecha límite
de fase y, desde el 2026-08-12, `estimated_hours` manual de esa fase).
**RLS exige sesión desde la Unidad B.4** (2026-08-09):
`projects`/`requirements`/`requirement_tasks`/`requirement_phase_deadlines`
solo son legibles con `auth.uid()` válido (`to authenticated`); escribir
exige además `public.is_admin()`. **`activity_logs`** (la bitácora de horas
de la Fase C) **se eliminó por completo el 2026-08-12** (tabla, triggers y
policies) — "horas ejecutadas" pasó a ser un campo editable directamente,
mantenido por la aplicación (ver "Estado actual"). **`document_versions`
se eliminó por completo en el cierre técnico pre-refinamiento (2026-08-11)** —
era scaffolding vacío sin ninguna policy, de un diseño de documentos
versionados descartado por decisión del PO; no se recreará. El DDL original
de la Fase A
(`supabase/schema.sql`) quedó archivado en `supabase/legado/schema-fase-a.sql`
("HISTÓRICO. No ejecutar") una vez migrado a migraciones versionadas en la
Unidad 0.1.

Los datos se migraron una sola vez con `scripts/migrate_to_supabase.py`
(Python + openpyxl + `supabase-py`, idempotente vía upsert) — el detalle
campo a campo de esa migración (qué hoja mapeaba a qué columna, etc.) ya no
vive en ningún documento vigente; sigue disponible en el historial de git
si algún día hiciera falta. No hay polling ni
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

## Seguridad

Verificación de RLS con evidencia real (no por inspección visual) contra
producción, con las 11 pruebas del checklist de la Unidad B.6 (anónimo no
lee, Viewer lee pero no escribe/inserta/borra, Admin sí escribe, escalada
de privilegio bloqueada, signup cerrado, sesión/HTML sin marcador
admin-only para Viewer): `supabase/RUNBOOK_AUTH.md`. Script reutilizable
para repetir la verificación: `scripts/verificar_seguridad_fase_b.mjs`
(lee credenciales de variables de entorno, nunca hardcodeadas).

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
- **`zod`** para validar el input de toda Server Action de escritura —
  decisión deliberada de unificar el mecanismo de validación (antes mixto:
  algunas funciones usaban zod, otras `typeof x !== "string"` a mano).
- **3 módulos de datos con `Pick<...>` propios sobre `requirements`/
  `requirement_tasks`** (`dashboard-data.ts`, `requerimiento-data.ts` ×2,
  `planeacion-data.ts`) en vez de un adaptador común — **decisión
  deliberada de no unificar** (ver comentario en `planeacion-data.ts`):
  cada módulo alimenta una pantalla con un shape de salida distinto
  (`Requerimiento`/`RequerimientoDetalle`/`PlaneacionRequerimiento`), y
  forzar un tipo común movería la duplicación existente sin reducirla
  realmente.
- Base de datos real (Supabase/Postgres) desde la Fase A. **Autenticación
  real desde la Unidad B.3**: Supabase Auth con `/login`, logout,
  recuperar/restablecer contraseña, y `src/proxy.ts` exigiendo sesión en
  toda ruta no pública. Roles Admin/Viewer existen (tabla `profiles`,
  Unidad B.2); en RLS ya distinguen (Unidad B.4: solo Admin puede
  escribir), y desde la Unidad B.5 la UI también oculta contenido por rol:
  `RoleBadge` sigue siendo solo informativo, pero `RoleGate` (Server
  Component) condiciona qué se renderiza — para un Viewer, los `children`
  nunca se serializan en el payload RSC. RLS sigue siendo el control real;
  `RoleGate` es reducción de superficie, no seguridad. **Regla para Fase C:
  toda Server Action que escriba debe empezar con `requireAuth()`/
  `requireAdmin()`** (`src/lib/auth/session.ts`), no confiar solo en RLS
  para dar feedback claro al usuario.
- **Control de versiones**: repo git local, rama `main` (tracking
  `origin/main`), remoto `https://github.com/jebb10/Tablero.git`. Flujo
  rama + PR desde la Fase B (antes, push directo a `main` en la Fase 0).
  El commit inicial de `create-next-app` y el placeholder que traía el
  repo remoto quedaron reemplazados con confirmación explícita del PO en
  el punto de control MVP — desde ahí el historial crece por PR normal.

### Archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `supabase/migrations/` | DDL versionado (tablas, RLS, seed del proyecto), aplicado vía `npm run db:push` (CLI de Supabase). El DDL original de la Fase A quedó archivado en `supabase/legado/schema-fase-a.sql` ("HISTÓRICO. No ejecutar"). |
*(`scripts/migrate_to_supabase.py` migró el `.xlsx` legado a Supabase una sola vez en la Fase A; se eliminó del repo en la limpieza de 2026-08-11 — el `.xlsx` fuente ya no existe y el script era inejecutable. Detalle campo a campo en el historial de git si algún día hiciera falta.)*
| `scripts/create_user.mjs` | Script admin-run (Unidad B.2) para crear/actualizar usuarios: `auth.admin.createUser` + upsert en `profiles`, idempotente por email. Lee `SUPABASE_SECRET_KEY` de entorno, nunca del código. Único flujo soportado para altas de usuario — evita el estado roto de un usuario en `auth.users` sin fila en `profiles`. |
| `src/lib/supabase/server.ts` | `getSupabaseClient()` (async, Unidad B.1) — cliente `anon` de `@supabase/ssr` (`createServerClient`) con cookies de sesión vía `cookies()` de `next/headers`. Usado por Server Components/data-loaders. |
| `src/lib/supabase/config.ts` | `SUPABASE_URL`/`SUPABASE_ANON_KEY` hardcodeadas (Unidad B.1, antes vivían en `server.ts`) — mismo motivo que el antiguo `SHEET_ID`, ver "Fuente de datos". |
| `src/lib/supabase/proxy-client.ts` | `createProxyClient(request)` (Unidad B.1) — cliente que lee/escribe cookies vía `NextRequest`/`NextResponse`, usado únicamente por `src/proxy.ts`. |
| `src/proxy.ts` | Proxy de Next 16.2 (Unidad B.1, reemplaza a `middleware.ts`) — desde la Unidad B.3, exige sesión: si `auth.getUser()` no devuelve usuario y la ruta no es pública (`/login*`, `/auth*`), redirige a `/login?next=<ruta>` (protección optimista; la RLS pública sigue siendo el respaldo real hasta B.4). Matcher excluye `_next/static`/`_next/image`/`favicon.ico`/imágenes/fuentes. |
| `src/lib/auth/session.ts` | `getCurrentProfile()` (Unidad B.3, memoizado con `cache()`) — valida el usuario contra Supabase Auth y lee su `role`/`full_name` de `profiles`; sin fila en `profiles` = no autorizado. `requireAuth()`/`requireAdmin()` se usan al inicio de toda Server Action de escritura. |
| `src/app/login/page.tsx` + `src/app/login/actions.ts` | Página de login (Server Component) + Server Actions `loginAction()`/`cerrarSesion()` (Unidad B.3) — `signInWithPassword`/`signOut` de Supabase Auth, con `rutaSegura()` para evitar open-redirect vía `?next=`. |
| `src/app/login/recuperar/*` + `src/app/login/restablecer/*` | Flujo de recuperar/restablecer contraseña (Unidad B.3) — probado en vivo en producción, ver "Estado actual". |
| `src/app/auth/callback/route.ts` | Route Handler (Unidad B.3) que intercambia el código PKCE del correo de recuperación por una sesión real. |
| `src/components/auth/login-form.tsx`, `recuperar-form.tsx`, `restablecer-form.tsx` | Formularios cliente (Unidad B.3) sobre `useActionState`, con componentes shadcn/ui (`Alert`, `Button`, `Input`, `Label`, `Spinner`) + tokens del sistema de diseño de Claude Design. |
| `src/components/auth/role-badge.tsx` | `RoleBadge` (Unidad B.3) — badge visual Admin/Viewer en el nav de `layout.tsx`; puramente informativo. |
| `src/components/auth/role-gate.tsx` | `RoleGate` (Unidad B.5) — Server Component que oculta `children` a quien no tenga el `role` indicado (default `"admin"`), resuelto con `getCurrentProfile()`. Estrenado en `layout.tsx` con un indicador de nav solo-Admin (`data-testid="admin-only"`). |
| `src/lib/supabase/database.types.ts` | Tipos generados vía `npm run types:db` (CLI de Supabase) — usado por los tres módulos `src/lib/*-data.ts` para tipar las consultas sin `as`. |
| `src/lib/project.ts` | `PROJECT_SLUG` — default hardcodeado del único proyecto real sembrado en la tabla `projects`. |
| `src/lib/estados.ts` | Fuente única de estados: `ESTADOS_DB`, `ESTADO_DB_A_ES`/`ESTADO_ES_A_DB`, `dbAEstado()` (con `console.warn` para valores no mapeados). Sustituye el `Record` de 4 claves que antes vivía inline en `dashboard-data.ts`. |
| `src/lib/estados-tarea.ts` | Equivalente a `estados.ts` para `requirement_tasks.status` (6 valores canónicos de la Unidad C2.1) — `estadoEsCompletada()` es la función más cubierta por tests del repo. |
| `src/lib/category.ts` | Mapeo de categoría de requerimiento usado por `requerimiento-card.tsx`/`RequerimientoIcono`. |
| `src/lib/tarea-schema.ts` | Esquemas zod de las Server Actions de `src/app/actions/tasks.ts` (crear/editar tarea, fechas planeadas, horas ejecutadas). |
| `src/lib/planeacion-fechas-schema.ts` | Esquema zod de `guardarFechasPlaneadas()`, consumido por la RPC `rpc_set_planned_dates`. |
| `src/lib/slug.ts` | `slugify()` — port TS del script de migración one-time ya retirado del repo, verificado contra los 28 códigos reales en `src/lib/__tests__/slug.fixtures.json`. |
| `src/lib/fases-orden.ts` | `FASES_ORDEN` — antes duplicado en `fases.ts` y `planeacion-data.ts`. |
| `src/lib/fechas.ts` | `hoyLocal()`/`aISO()`/`desdeISO()`/`sumarDias()`/`diffDias()`/`aInputDate()` en zona `America/Bogota` — fuente única de formateo de fechas, usada por varios componentes de tareas/fases. |
| `src/lib/semaforo.ts` | `calcularSemaforo(deadline)` — rojo/ámbar/verde/sin-fecha por proximidad de fecha límite (umbrales 3/10 días). Reusado en la card y en `/planeacion`. |
| `src/lib/fases.ts` | `agruparPorFase(filas)` — agrupa filas planas de `requirement_tasks` en el shape `Fase[]` que consume `FaseStepper`. |
| `src/lib/planeacion-data.ts` | `getPlaneacionData()` — consulta requerimientos con `has_detail_tracking` + sus tareas, arma el shape que consume `/planeacion`. |
| `src/lib/kpis.ts` | `getKPIs()` — puramente sobre el array de `Requerimiento[]` ya adaptado, sin tocar Supabase directamente. |
| `src/lib/dashboard-data.ts` | `getDashboardData()` — consulta `requirements` por `project_id`, adapta cada fila DB → `Requerimiento` (mismo shape de siempre), con caché in-memory del último resultado bueno si Supabase no responde. Único punto de entrada que usa `src/app/page.tsx`. |
| `src/lib/requerimiento-data.ts` | `getRequerimientoDetalle(slug)` — consulta `requirements`+`requirement_tasks` en Supabase por `slug`, con su propio try/catch. Único punto de entrada del drill-down, usado por `src/app/requerimiento/[item]/page.tsx`. |
| `src/lib/types.ts` | Tipos compartidos (`Requerimiento`, `Fase`, `Tarea`, `KPIs`, etc.). `Requerimiento` ganó `semaforo: Semaforo`; perdió `hojaDetalle` (concepto específico de Excel, ya no aplica); ganó `id` (UUID, 2026-08-13) para poder cruzar con `requirement_phase_deadlines` desde `/horas` sin duplicar la query de `requirements`. |
| `src/lib/icons.tsx` | `RequerimientoIcono` (componente, no una función que devuelve un componente — así lo exige la regla `react-hooks/static-components` de eslint) que mapea el ícono por patrón en el nombre del requerimiento. |
| `src/app/page.tsx` | Server Component: llama `getDashboardData()`, muestra solo el banner de error si no hay ningún dato previo bueno. |
| `src/app/planeacion/page.tsx` + `src/components/planeacion/*` | Vista Gantt: `gantt-sidebar.tsx` (colapsable desktop + drawer mobile vía `Sheet`), `gantt-timeline.tsx` (grid CSS por día, sin librería externa), `planeacion-client.tsx` (orquestador). |
| `src/components/dashboard-client.tsx` | KPIs, búsqueda/filtros, los 4 bloques de estado, botón Exportar PDF, atenúa el dashboard si `error` es `true`. **Ya no tiene botón "Sincronizar"** (se retiró — ver "Fuente de datos"). |
| `src/components/requerimiento-card.tsx` | Card individual ampliada (~176px, badge de mes, fila horas/fecha, dot de semáforo junto a la fecha) (RN-04). El semáforo **convive** con el borde de "bloqueado" (RN-03) — son dos señales distintas, no se reemplazan entre sí. |
| `src/components/kpi-strip.tsx` | 5 KPIs (Requerimientos, Horas ejecutadas/estimadas, En curso, Reabiertos, Con bloqueo activo). **El panel de "Calidad de datos" y su KPI se retiraron por completo** en el refinamiento de Home de 2026-08-11 — no confundir con versiones anteriores de este documento. Desde el 2026-08-13, "En curso" enlaza a `#en-curso` (autoscroll) y "Horas ejecutadas / estimadas" enlaza a `/horas`. |
| `src/components/error-datos-banner.tsx` | `ErrorDatosBanner` — Banner de error + botón Reintentar (llama a `reintentar()`, solo hace `refresh()` — no confundir con el antiguo botón "Sincronizar", que ya no existe), usado standalone (sin datos previos) o embebido en `dashboard-client.tsx` (con datos previos atenuados). |
| `src/components/pdf-report.tsx` | Reporte para impresión (`hidden print:block`), incluye los 28 requerimientos, sin el panel de calidad, sin numeración de página. |
| `src/components/agregar-tarea-dialog.tsx` | `AgregarTareaDialog` — único botón de registro por fase (fusión tarea/actividad, 2026-08-11): nombre, fecha límite (obligatoria — fix del bug de tareas invisibles en el Gantt), fechas planeadas y horas ejecutadas iniciales (opcional). |
| `src/components/tarea-acciones-admin/` | `TareaAccionesAdmin` (`index.tsx`) — orquesta por tarea: `EstadoTareaSelect`, `FechasPlaneadasForm`, `EditarHorasDialog` (edita `executed_hours` directamente, reemplazó a `RegistrarHorasDialog`/`activity_logs` el 2026-08-12), `EditarTareaForm` y `EliminarTareaButton`. Reemplaza a `editar-fechas-form.tsx` (eliminado). |
| `src/hooks/use-cerrar-al-exito.ts` | `useCerrarAlExito()` (cierre técnico 2026-08-11) — cierra un diálogo/formulario apenas una Server Action reporta éxito; reemplaza el patrón `successVisto` que estaba duplicado en 3 componentes. |
| `src/components/fase-fecha-limite-form.tsx` | `FaseFechaLimiteForm` — fecha límite propia de cada fase (`requirement_phase_deadlines`, independiente de las tareas). Desde el 2026-08-12 usa `display: contents` en su `<form>` para que el input (fila 1) y el botón "Guardar" (fila 2) caigan en celdas explícitas (`col-start-*`/`row-start-*`) del grid de controles de `TareasPorFase`, alineadas por su borde izquierdo con el chevron/"Añadir tarea". |
| `src/lib/fase-deadlines.ts` | `getFechasLimiteFase(requirementId)` / `getHorasEstimadasFase(requirementId)` (esta última, 2026-08-12) — leen `requirement_phase_deadlines`, usadas por `requerimiento-data.ts`. `planeacion-data.ts` hace su propia consulta batch de fechas para todos los requerimientos del Gantt; `getHorasEstimadasFasePorRequerimientos(ids)` (2026-08-13) es la variante batch análoga para horas estimadas, usada por `horas-reporte.ts`. |
| `src/lib/horas-reporte.ts` | `getReporteHoras()` (2026-08-13) — reusa `getDashboardData()` + `getHorasEstimadasFasePorRequerimientos()` para armar el reporte de `/horas`: por requerimiento, horas estimadas de fases 1/2/3 (Requerimientos/Diseño/Desarrollo), su suma, y horas ejecutadas totales reales. |
| `src/app/horas/page.tsx` | Página `/horas` (2026-08-13, Server Component, mismo patrón que `/planeacion`) — llama a `getReporteHoras()`, sin `requireAdmin()` (solo lectura, protegida por `src/proxy.ts` igual que el resto de rutas no públicas). |
| `src/components/horas-client.tsx` | `HorasClient` (2026-08-13) — tabla de `/horas` agrupada por estado (mismo orden que `dashboard-client.tsx`), link al Detalle por fila, botón "Exportar PDF" (mismo patrón `window.print()`), renderiza `HorasPdfReport` para la vista de impresión. |
| `src/components/horas-pdf-report.tsx` | `HorasPdfReport` (2026-08-13) — vista `hidden print:block` de `/horas`, calco de `pdf-report.tsx` con columnas de fase. |
| `src/lib/tareas-controles.tsx` | `construirControlesTareas(fases, requirementId)` — arma los botones/acciones de Admin (`RoleGate` + diálogos) que consume `TareasPorFase`, usado por Detalle del requerimiento. |
| `src/components/tareas-por-fase.tsx` | `TareasPorFase` — acordeón por fase (tarea = actividad, un solo concepto). Encabezado de fase rediseñado el 2026-08-12: título + chip de estado en una línea, "N/M completadas · Fase límite: fecha" en la siguiente, horas Estimadas/Consumidas en la suya (Consumidas en rojo si hay sobrepresupuesto); a la derecha, grid de 2 columnas con fecha límite+chevron arriba y Guardar+"Añadir tarea" abajo. Cada tarjeta de tarea lleva borde naranja institucional si está "En curso" o rojo si está "Bloqueada", conviviendo con la advertencia de texto libre existente (`bloqueantes`/`notas`); ya no muestra "Horas estimadas" por tarea (ver "Estado actual"). Usado solo en `/requerimiento/[item]` — es la única pantalla de edición de tareas/fechas. |
| `src/app/requerimiento/[item]/page.tsx` | Página de drill-down por requerimiento (RN-04/05). Llama a `getRequerimientoDetalle(slug)` (`src/lib/requerimiento-data.ts`) → `<ErrorDatosBanner soloBanner />` si falla. |
| `src/app/actions/ui.ts` | Server Action `reintentar()` (`refresh()`) (Unidad C2.5, antes en `src/app/actions.ts`) — usada solo por el banner de error. |
| `src/app/actions/tasks.ts` | Server Actions `guardarFechasPlaneadas()`/`crearTarea()`/`eliminarTarea()`/`actualizarTarea()`/`actualizarEstadoTarea()`/`guardarFechaLimiteFase()` y, desde el 2026-08-12, `actualizarHorasTarea()` (edita `executed_hours` de una tarea y recalcula `requirements.executed_hours` en la misma acción, reemplazando al trigger que antes dependía de `activity_logs`). |
| `src/app/actions/requirements.ts` | Server Actions `crearRequerimiento()`, `actualizarRequerimiento()`, `cerrarPorCambioDeAlcance()` (Unidad C2.3) — consumidas por `src/components/requerimiento-form.tsx` desde las tres rutas de formulario listadas abajo. Desde el 2026-08-12 también hacen `upsert` de las horas estimadas por fase (`requirement_phase_deadlines.estimated_hours`) leídas del mismo formulario. |
| `src/components/requerimiento-form.tsx` | Formulario compartido de requerimiento (Unidad C2.3), en modo crear/editar/cambio-de-alcance según la ruta que lo renderiza. Desde el 2026-08-12 incluye una sección de 5 campos opcionales "horas estimadas por fase" con un aviso informativo no bloqueante que compara su suma contra el total. |
| `src/app/requerimiento/nuevo/page.tsx` | Crear requerimiento — `RequerimientoForm` en modo creación (`requireAdmin()`). |
| `src/app/requerimiento/[item]/editar/page.tsx` | Editar requerimiento existente — `RequerimientoForm` en modo edición (`requireAdmin()`). |
| `src/app/requerimiento/[item]/cambio-de-alcance/page.tsx` | Cierra el requerimiento actual y crea uno nuevo enlazado (`parent_requirement_id`) — `RequerimientoForm` en modo cambio de alcance (`requireAdmin()`). |
| `public/fonts/montserrat-{400,500,600,700}.woff2` | Montserrat auto-hospedada (no `next/font/google`) — cargada vía `next/font/local` en `layout.tsx`. |

`src/lib/excel/*` (workbook/dashboard-sheet/detalle-sheet) y la dependencia
`xlsx` se **borraron** en la Fase A, una vez verificada la migración — ya
no hay ningún consumidor de ese código.

## Reglas de negocio implementadas (RN, de la HU TBL_HU0001)

- **RN-01** (4 categorías de estado): bloques En curso / Pausado / No
  iniciado / Entregado en producción.
- **RN-02** (overbudget): si horas ejecutadas > estimadas, se resalta en
  rojo (`status-overbudget`).
- **RN-03** (detección de bloqueos): la card lleva borde rojo
  (`status-bloqueo`) e ícono de alerta si el requerimiento tiene alguna
  tarea individual en estado "Bloqueada" (`tieneTareaBloqueda`) — mismo
  criterio que ya usaba el KPI "Con bloqueo activo". **Cambio de criterio
  (refinamiento de Home, 2026-08-12)**: antes se detectaba buscando
  "Actividad bloqueante"/"Espera de WS" en el campo `Notas` del
  requerimiento; ese campo (`requirements.notes`) quedó retirado del
  dashboard por completo (desalineaba el borde del KPI, que ya contaba por
  tarea bloqueada). Lo visible relacionado sigue siendo `bloqueantes`/`notas`
  a nivel de **tarea** individual en `tareas-por-fase.tsx`, un campo
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
  escala**.

## Historial de fases

Este proyecto se construyó por fases (0, A, B, C, C1, C2), todas completas y verificadas en
producción. La Fase C3 (bitácora de horas `activity_logs`) se dio por completa en su momento pero
se **eliminó por completo el 2026-08-12** al refinar el modelo de horas (ver "Estado actual") —
no quedó ningún rastro de esa fase en el código actual. **No hay ningún trabajo pendiente del
roadmap** — no se planea ninguna fase de documentos versionados ni ninguna otra fase futura. El
detalle de ejecución de las fases ya cerradas (decisiones tomadas con el PO, pivots de diseño,
contradicciones resueltas del diseño original) no se conserva como documento aparte en el repo —
vive en el historial de git (PRs #9–#29) y, para lo aún relevante operativamente, en
`supabase/RUNBOOK_AUTH.md`/`RUNBOOK_BACKUP.md`/`MIGRACIONES.md`.
