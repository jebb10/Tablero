@AGENTS.md

# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo que muestra el estado de los requerimientos del proyecto
Positiva Web 414: en qué estado va cada uno, horas consumidas vs. estimadas, y
el detalle de tareas por fase al hacer drill-down. Este es un proyecto **vivo,
construido por fases** — no asumas que la fase actual es la versión final;
consulta siempre "Estado actual" abajo antes de proponer cambios grandes.

## Estado actual: Fase 0, Fase B, Fase C, Unidad C1 (Gantt real), Unidad C2.1 y Unidad C2.5 completas y verificadas

- Desplegado en Vercel: [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)
  (repo: `https://github.com/jebb10/Tablero.git`). **RLS ya exige sesión
  para leer datos** desde la Unidad B.4 (2026-08-09): la anon key pública
  del bundle del navegador ya no puede leer `projects`/`requirements`/
  `requirement_tasks` por PostgREST. Desde la Unidad B.3 **ya existe
  `/login` real**: login, logout, recuperar/restablecer contraseña
  completos, y `src/proxy.ts` redirige a `/login` cualquier ruta sin
  sesión. **Unidad B.5 (`RoleGate`) completa**: la UI ya oculta controles/
  indicadores solo-Admin a los Viewers, no solo la RLS — ver
  `src/components/auth/role-gate.tsx`. **Unidad B.6 completa**: checklist
  de seguridad de 11 puntos corrido contra producción con evidencia real
  (11/11 en verde) — ver `supabase/RUNBOOK_AUTH.md`.
- **El flujo completo de recuperar/restablecer contraseña se probó en vivo
  con éxito en producción (confirmado por el PO)**: pedir el correo, llegar
  el enlace, aterrizar en `/login/restablecer` y definir la nueva
  contraseña funcionó de punta a punta en `https://tablero-pi.vercel.app`.
  El Redirect URL de `/auth/callback` de producción **ya está whitelisteado**
  en Supabase (Authentication → URL Configuration). **Sigue sin configurarse
  un SMTP propio** — pospuesto explícitamente por el PO hasta después de
  cerrar Fase C (riesgo bajo hoy, con 1 Admin + pocos Viewers).
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
  (Fase A del nuevo roadmap), la Fase 0 (fundaciones: migraciones
  versionadas, tipos generados, CI, backup, andamiaje compartido — ver más
  abajo) y la Fase B (auth/roles) ya están completas; Fase C (pantallas de
  escritura, versión original del PR #9) y la Unidad C1 (Gantt real) ya
  están completas, la Fase C2 (CRUD) está en curso (unidad C2.1 cerrada,
  ver más abajo) y las Fases C3 (bitácora de horas) y D (documentos
  versionados, fuera de alcance de esta ronda) siguen pendientes — ver
  `ROADMAP_V2.md` para el diseño vigente completo y
  `PLAN_EJECUCION_C2_C3.md` para las decisiones tomadas y el estado de
  ejecución de esta ronda (`ROADMAP_SUPABASE.md` queda como historial,
  superado).
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
- **✅ Resuelto (2026-08-10, Unidad C1)**: `planned_start_date`/
  `planned_end_date` ya no están `NULL` — semillados en producción (164/164
  tareas, 0 filas con fecha faltante/invertida/absurda) y editables desde
  `/planeacion/[requerimiento]/editar`. Ver bullet de C1 más abajo.
- **Fase C ya fue implementada y mergeada a `main` (PR #9, commit
  `ce1dc7d`) — desplegada en producción**: implementa Home (KPIs "Reabiertos"/"Salud del
  proyecto", fase actual, hitos próximos — `kpi-strip.tsx`,
  `dashboard-data.ts`), el Gantt visual (rombos de hito, indicador de texto
  "fecha estimada, no confirmada" para `planned_dates_confirmed = false` —
  `gantt-timeline.tsx`), el detalle (acordeón de tareas por fase con TODAS
  las tareas, no solo las de la fase en curso — `tareas-por-fase.tsx`,
  reemplaza a `fase-stepper.tsx`, ya borrado) y el registro de actividades
  (modal "Añadir actividad", solo Admin vía `RoleGate`, con el autor visible
  para el Viewer vía la función `nombre_autor()`) — todo contra el proyecto
  Supabase real, con 2 migraciones ya aplicadas
  (`20260809192913_fase_c_campos_y_activity_logs.sql`,
  `20260809221243_fix_autor_actividad_visible_a_viewer.sql`).
  **Esto NO es lo mismo que las unidades C1 (Gantt de fechas reales, ✅
  completa desde 2026-08-10, ver bullet más abajo)/C2 (CRUD de
  requerimientos y tareas)/C3 (bitácora de horas ejecutadas vía trigger) de
  `ROADMAP_V2.md`; C2/C3 siguen pendientes** — son dos desgloses distintos
  de "Fase C" con el mismo prefijo, no confundirlos
  (ver `PLAN_IMPLEMENTACION_FASE_C.md`, ya marcado como ejecutado, para el
  detalle exacto de lo implementado). Verificado en código: acordeón
  completo, botón de actividad gateado por rol, sin referencias colgantes a
  `documentation_folder_url` (columna eliminada en la migración).
  **Verificación en vivo completada y aprobada por el PO (2026-08-10)**:
  KPI "Reabiertos" tras reabrir un requerimiento, cambio de color de
  "Salud del proyecto" con una tarea vencida, autor correcto en una
  actividad nueva, y que un Viewer no puede insertar en `activity_logs`
  vía API directa — los 4 puntos de la sección 5 de
  `PLAN_IMPLEMENTACION_FASE_C.md` en verde. **Fase C queda cerrada por
  completo.**
- **✅ Unidad C1 (Gantt de fechas reales) completa y verificada
  (2026-08-10, PR #10, rama `fase-c1` mergeada a `main`)**: semillado de
  `planned_start_date`/`planned_end_date` (164/164 tareas, criterio mixto
  horas/6 o duración fija por fase), pantalla
  `/planeacion/[requerimiento]/editar` (edición de fechas vía RPC
  `rpc_set_planned_dates`, más crear/eliminar tareas — alcance ampliado en
  vivo con el PO, que originalmente pertenecía a C2), Gantt rediseñado con
  **ventana navegable** (mes calendario/semana/14 días + botones
  "< Hoy >", en vez de comprimir todo el rango — pivot de diseño pedido
  por el PO tras revisar el primer corte en producción), nuevo estado de
  semáforo `"vencido"` (distinto de "rojo"/próximo a vencer), y una
  **extensión de horas ejecutadas por tarea** fuera del diseño original de
  C3 (`activity_logs.task_id` + `requirement_tasks.executed_hours` vía
  trigger — ver nota en `ROADMAP_V2.md` §C3.3 para quien retome C3). Ver
  `design/contratos/contrato-datos-gantt.md` para el detalle completo del
  estado final.
- **✅ Unidad C2.1 (status de tarea a conjunto canónico) completa y
  verificada (2026-08-10, PR #12, rama `fase-c2-1` mergeada a `main`)**:
  `requirement_tasks.status` pasa de texto libre a un `CHECK constraint`
  de 6 valores (`No iniciada`, `Pendiente`, `En curso`, `Bloqueada`,
  `Completada`, `Cancelada`) — ver detalle completo en "Roadmap de fases"
  más abajo y en `PLAN_EJECUCION_C2_C3.md` (plan vigente de esta ronda,
  en la raíz del repo, con estado de ejecución unidad por unidad). En el
  camino se cerró también el **PR #11** (rama `fix-lint-c1`): `npm run
  lint` estaba roto en `main` desde el PR #10 por reglas nuevas de
  `eslint-config-next`, sin cambio de comportamiento.
- **✅ Unidad C2.5 (reestructuración de Server Actions + componentes
  shadcn) completa (2026-08-10, rama `fase-c2-5`)**: las Server Actions
  del proyecto (antes repartidas en `src/app/actions.ts`,
  `src/app/requerimiento/[item]/actions.ts` y
  `src/app/planeacion/[requerimiento]/editar/actions.ts`) se consolidaron
  por dominio en `src/app/actions/{ui,requirements,tasks,activity-logs}.ts`
  (los 3 archivos originales se eliminaron; `requirements.ts` queda como
  stub sin exports hasta C2.3). Se instalaron los 5 componentes shadcn que
  faltaban bajo el preset Base UI (`table`, `textarea`, `alert-dialog`,
  `checkbox`, `dialog` — solo `label` ya existía) vía `npx shadcn add`, sin
  necesidad de escribir ninguno a mano. **Ojo para el futuro**: ese mismo
  comando sobreescribió `button.tsx` con la versión genérica del registro,
  perdiendo momentáneamente los tokens de Claude Design
  (`--primary-hover`/`--primary-disabled`) — se revirtió a mano; cualquier
  `npx shadcn add` posterior debe revisar `git diff` de los componentes ya
  personalizados antes de commitear.
- **Sigue faltando** (ver `ROADMAP_V2.md` para el diseño y
  `PLAN_EJECUCION_C2_C3.md` para el estado de ejecución exacto): el resto
  de la Fase C2 (C2.2 edición inline de tareas, C2.4 hacer navegables los
  21 sin detalle, C2.3 crear/editar requerimiento — en ese orden), la Fase
  C3 (bitácora de horas ejecutadas a nivel de requerimiento) y la Fase D
  (documentos versionados en Storage, **explícitamente fuera de alcance de
  esta ronda de trabajo**, sin fecha de retoma). Fase 0 y Fase B
  (fundaciones y auth/roles) ya están completas.

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
| `src/components/auth/role-badge.tsx` | `RoleBadge` (Unidad B.3) — badge visual Admin/Viewer en el nav de `layout.tsx`; puramente informativo. |
| `src/components/auth/role-gate.tsx` | `RoleGate` (Unidad B.5) — Server Component que oculta `children` a quien no tenga el `role` indicado (default `"admin"`), resuelto con `getCurrentProfile()`. Estrenado en `layout.tsx` con un indicador de nav solo-Admin (`data-testid="admin-only"`). |
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
| `src/components/tareas-por-fase.tsx` | `TareasPorFase` (Fase C) — acordeón cliente de las 5 fases reales, TODAS sus tareas visibles (no solo la fase en curso), fases no completadas abiertas por defecto. Reemplaza a `fase-stepper.tsx` (ya borrado, sin consumidores). |
| `src/lib/actividades-data.ts` | `getActividades(requirementId)` (Fase C) — consulta `activity_logs` por requerimiento, resuelve el nombre del autor vía `nombre_autor()` (RPC security-definer, visible también para el Viewer). |
| `src/lib/actividad-tipos.ts` | `TIPOS_ACTIVIDAD_VALIDOS`/`TIPO_ACTIVIDAD_LABEL` (Fase C) — fuente única, antes duplicada en dos componentes. |
| `src/components/boton-agregar-actividad.tsx` | `BotonAgregarActividad` (Fase C) — modal cliente con `useActionState` sobre `agregarActividad()`; envuelto en `<RoleGate role="admin">` desde `page.tsx`, nunca llega al payload RSC de un Viewer. |
| `src/components/registro-actividades.tsx` | `RegistroActividades` (Fase C) — tabla de bitácora por requerimiento, recibe el botón de agregar ya gateado por rol como children. |
| `src/app/requerimiento/[item]/page.tsx` | Página de drill-down por requerimiento (RN-04/05). Llama a `getRequerimientoDetalle(slug)` (`src/lib/requerimiento-data.ts`) → `<ErrorDatosBanner soloBanner />` si falla; ídem para `getActividades()` (Fase C). |
| `src/app/actions/ui.ts` | Server Action `reintentar()` (`refresh()`) (Unidad C2.5, antes en `src/app/actions.ts`) — usada solo por el banner de error. |
| `src/app/actions/activity-logs.ts` | Server Action `agregarActividad()` (Fase C, reubicada en Unidad C2.5 desde `src/app/requerimiento/[item]/actions.ts`) — `requireAdmin()` → valida tipo/título/horas/fecha → `insert` en `activity_logs` con `created_by` → `refresh()`. |
| `src/app/actions/tasks.ts` | Server Actions `guardarFechasPlaneadas()`/`crearTarea()`/`eliminarTarea()` (Unidad C1.2, reubicadas en Unidad C2.5 desde `src/app/planeacion/[requerimiento]/editar/actions.ts`). |
| `src/app/actions/requirements.ts` | Stub (`"use server";`, sin exports) creado en la Unidad C2.5 — primer consumidor real: Unidad C2.3 (crear/editar requerimiento). |
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
- **Fase B — Supabase Auth + roles (Admin/Viewer):** ✅ **completa**
  (2026-08-09). El detalle de verificación en vivo de cada unidad no se
  conserva como documento aparte (lo esencial ya vive en "Seguridad" arriba
  y en `supabase/RUNBOOK_AUTH.md`). Resumen: clientes SSR + `proxy.ts` (B.1),
  `profiles` + `is_admin()` + usuarios reales (B.2), `/login` + logout +
  recuperar/restablecer contraseña (B.3, alcance ampliado respecto al diseño
  original), flip de RLS a solo-autenticados (B.4, 2026-08-09:
  `projects`/`requirements`/`requirement_tasks` ya no son legibles con la
  anon key, trigger `updated_at` activado), `RoleGate` ocultando contenido
  solo-Admin en la UI (B.5), checklist de seguridad de 11 puntos con
  evidencia real contra producción (B.6, 11/11 en verde). Único pendiente
  conocido, pospuesto explícitamente por el PO: SMTP propio en Supabase,
  hasta después de cerrar Fase C. Desde la Unidad B.1, Fase B usó rama +
  PR (no push directo a `main`).
- **Fase C — Pantallas de escritura:** ✅ **completa** (2026-08-10).
  Home/Gantt-visual/Detalle/Registro de actividades implementados,
  mergeados a `main` (PR #9) y verificados en vivo (los 4 puntos de la
  sección 5 de `PLAN_IMPLEMENTACION_FASE_C.md`, aprobado por el PO) — ver
  "Estado actual" arriba.
- **Unidad C1 — Gantt de fechas reales:** ✅ **completa** (2026-08-10, PR
  #10). Ver "Estado actual" arriba para el detalle completo.
- **Unidad C2.1 — Estado de tarea a conjunto canónico:** ✅ **completa**
  (2026-08-10, rama `fase-c2-1`). `requirement_tasks.status` pasa de texto
  libre a un `CHECK constraint` de 6 valores (`No iniciada`, `Pendiente`,
  `En curso`, `Bloqueada`, `Completada`, `Cancelada`) — los 165 valores
  reales ya coincidían exactamente, sin necesidad de `UPDATE` de
  normalización. Nuevo `src/lib/estados-tarea.ts`
  (`ESTADOS_TAREA`/`estadoEsCompletada()`) reemplaza los 6 sitios dispersos
  que comparaban `status.toLowerCase() === "completada"` (o, en un caso,
  sin normalizar). Resto de C2 (C2.2/C2.4/C2.3) y C3 siguen
  pendientes — ver `PLAN_EJECUCION_C2_C3.md` (plan vigente de esta ronda,
  en la raíz del repo) para el detalle y el estado de ejecución unidad por
  unidad. **Fuera de plan, resuelto en el camino**: `npm run lint` estaba
  roto en `main` desde el PR #10 por una versión más nueva de
  `eslint-config-next` (PR #11, rama `fix-lint-c1`, mergeado antes de
  C2.1, sin cambio de comportamiento).
- **Unidad C2.5 — Reestructuración de Server Actions + componentes
  shadcn:** ✅ **completa** (2026-08-10, rama `fase-c2-5`). Ver "Estado
  actual" arriba para el detalle completo, incluyendo el cuidado a tener
  en cuenta con `npx shadcn add` sobreescribiendo componentes ya
  personalizados.
- **Fase D — Documentos versionados (sin versionado real: subir reemplaza y
  borra el anterior):** pendiente, y **explícitamente fuera de alcance de
  la ronda de trabajo C2/C3 iniciada 2026-08-10** (decisión del PO, sin
  fecha de retoma) — diseño completo en `ROADMAP_V2.md` para cuando se
  retome.

Resumen ejecutivo de la Fase A: `ROADMAP_SUPABASE.md` (en la raíz de este
repo) — queda como historial, **superado**. Diseño vigente de lo que falta
(C1 en adelante): `ROADMAP_V2.md` (en la raíz de este repo) — se mantiene
liviano a propósito, solo con el diseño de unidades pendientes; incluye la
tabla de 14 puntos donde `ROADMAP_SUPABASE.md` contradice lo que hay en
disco. El detalle de verificación en vivo de las unidades ya cerradas (Fase
0, Fase B) no se conserva como documento aparte — lo esencial ya vive en
`supabase/RUNBOOK_AUTH.md` y en los resúmenes de arriba. Lo implementado de
Fase C vive en `PLAN_IMPLEMENTACION_FASE_C.md` (ejecutado, rama `fase-c`).
**El plan de ejecución vigente para C2/C3 (con las ~20 decisiones tomadas
con el PO el 2026-08-10 y el estado de ejecución unidad por unidad) vive en
`PLAN_EJECUCION_C2_C3.md`, en la raíz de este repo — leerlo antes de
retomar cualquier unidad de C2/C3.**
