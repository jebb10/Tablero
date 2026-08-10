# ROADMAP v2.0 — Tablero 414

> **ESTE es el documento de hoja de ruta vigente** (escrito el 2026-08-06, tras una auditoría profunda
> del código y de la base de datos reales). `ROADMAP_SUPABASE.md` queda **superado**: sirve solo como
> historial de la Fase A y de las decisiones tomadas con el PO antes de ella — **no ejecutar nada desde
> ahí**, contiene 14 puntos que contradicen lo que hay en disco (ver la tabla de contradicciones abajo).
>
> **Primera acción de la sesión de ejecución:** añadir un encabezado en `ROADMAP_SUPABASE.md` que apunte
> a este archivo, actualizar el puntero en `CLAUDE.md`, y commitear ambos junto con este documento.
>
> Se ejecuta **por sesiones separadas**. Cada *unidad* (0.1, B.3, C1.2…) es una sesión: se abre, se
> completa, se verifica con sus criterios de aceptación, se commitea y se cierra. **No mezclar unidades
> en un commit.** Antes de empezar cualquier unidad, leer "Convenciones para el ejecutor".

---

## Contexto: por qué una v2.0

La Fase A (migración Excel → Supabase) se ejecutó y se verificó el 2026-08-06. El roadmap que la
produjo (`ROADMAP_SUPABASE.md`) sigue siendo la única guía para las Fases B/C/D, pero **fue escrito
antes de que existiera el esquema real**, y una auditoría profunda del código y de la base de datos
encontró **14 puntos en los que ese documento contradice lo que hay en disco**. Ejecutar B/C/D tal
como están escritas hoy produciría fallos: el roadmap promete columnas que no existen, un patrón de
edición inline que el componente actual no puede soportar, y una tabla de bitácora sin autor ni
permisos.

Además, el roadmap v1 **no contempla nada de la infraestructura mínima** que una aplicación con
escritura necesita: no hay migraciones versionadas (el esquema ya se desincronizó una vez), no hay
tipos generados, no hay tests ni CI, no hay backup (el `.xlsx` cumplía ese rol y se borró), y no hay
manejo de errores en dos de las tres rutas.

**Objetivo de la v2.0:** que una sesión futura de Claude Code, **sin memoria de esta conversación**,
pueda abrir el documento, tomar la siguiente unidad de trabajo, ejecutarla de punta a punta,
verificarla contra criterios objetivos y cerrarla — sin volver a preguntar nada ya decidido y sin
tropezar con las contradicciones del v1.

---

## Decisiones tomadas en esta sesión (2026-08-06) — NO volver a preguntar

Producto de un cuestionario de 10 preguntas al PO:

| # | Decisión | Consecuencia |
|---|---|---|
| 1 | **Cerrar todo con login.** RLS pasa a solo-autenticados. | La lectura pública desaparece. Esto **anula** cualquier supuesto de "el dashboard es un link compartible". Unidad B.4. |
| 2 | **Orden: Fundaciones → Auth → Gantt.** | La privacidad pesa más que el pendiente del Gantt. El Gantt (C1) no arranca hasta que B esté cerrada. |
| 3 | **Supabase CLI con `supabase/migrations/`.** | Bloqueante: hay que obtener la contraseña de la BD (hoy `SUPABASE_DB_URL` está comentada en `.env.local`). Unidad 0.1. |
| 4 | **Backup: GitHub Actions diario** con `db dump` a artifacts (90 días) + copia mensual manual. | Requiere la misma contraseña + un secreto en GitHub. Unidad 0.5. |
| 5 | **Gantt: sembrar fechas por SQL + pantalla de revisión.** | Se añade `planned_dates_confirmed` para distinguir estimado de confirmado. Unidades C1.1 y C1.2. |
| 6 | **Horas ejecutadas: columna mantenida por trigger** + entrada de backfill "Saldo inicial migrado". | **Anula** la decisión del v1 ("suma en vivo al leer"). Ni una línea del camino de lectura cambia. Unidad C3.3. |
| 7 | **1 Admin (el PO) + varios Viewers, email+contraseña.** Sin registro abierto. | Un solo flujo de login. Los usuarios se crean con script admin-run. Unidad B.2/B.3. |
| 8 | **CI completo en GitHub** (typecheck + lint + tests + build en cada push). | Unidad 0.3. |
| 9 | **Documentos: SIN versionado.** Subir un documento nuevo **borra el anterior y lo reemplaza**. | **Anula por completo** el diseño de la Fase D del v1 (`is_latest`, `version`, historial). Ver Fase D reescrita. Cabe holgadamente en el free tier (~0.34 GB). |
| 10 | **Entra en alcance:** hacer navegables los 21 requerimientos sin detalle; distinguir "vencido" de "por vencer" en el semáforo. **NO entra:** selector multi-proyecto, filtros en la URL. | Unidades C2.4 y C1.4. Lo no marcado queda documentado como fuera de alcance deliberado. |

---

## Contradicciones del roadmap v1 vs. la realidad en disco

Corregir esto es objetivo explícito de la v2.0. **Cada fila debe quedar marcada como resuelta en
`ROADMAP_V2.md` conforme se ejecuten las unidades**; si no, una sesión futura volverá a leer las
decisiones equivocadas.

| # | El v1 dice | La realidad | Se resuelve en |
|---|---|---|---|
| 1 | `document_versions` con `is_latest`, `storage_path`, `uploaded_by` | `schema.sql:90-98` solo tiene `file_url` + `version varchar(20)`. Ninguna de esas columnas existe | D.1 (y además cambia el diseño por la decisión #9) |
| 2 | "`updated_at` se activa en Fase C" | El trigger sigue **comentado** (`schema.sql:118-124`); la columna es inerte | B.4 |
| 3 | "RLS con SELECT público" | **Cero policies de INSERT/UPDATE/DELETE en las 5 tablas.** `activity_logs` y `document_versions` tienen RLS **sin ninguna policy** → ni se pueden leer | B.4, C3.1, D.1 |
| 4 | La bitácora incluye `created_by` | `activity_logs` **no tiene** columna de autor | C3.1 |
| 5 | DDL §2: `milestone varchar(255)` | Ya es `text` (un hito de 264 chars rompió la migración). El §2 se contradice con su propio "Cierre de Fase A" | 0.1 (baseline) |
| 6 | "editar estado de tarea inline en `fase-stepper.tsx`" | El stepper **solo renderiza las tareas de la fase `en-curso`, y solo las no completadas** (`fase-stepper.tsx:25-28`) → la mayoría de las 185 tareas son inalcanzables | C2.2 |
| 7 | "los 21 heurísticos no clickeables" **y** "pantallas para editar requerimientos" | `requerimiento-card.tsx:35,126` no los envuelve en `<Link>` → **no hay página desde la cual editarlos**. Las dos decisiones son incompatibles | C2.4 |
| 8 | El enum tiene `CERRADO_POR_CAMBIO_ALCANCE` | `ESTADO_DB_A_ES` (`dashboard-data.ts:12-17`) **no tiene esa entrada** → caería en `?? "No iniciado"`. El tipo `Estado` solo tiene 4 valores y `dashboard-client.tsx:22-31` solo 4 bloques | 0.6 |
| 9 | "sum(activity_logs) al leer, query simple" | Implicaría una 4ª query en `getDashboardData` (ya encadena 3), otra en el drill-down y otra en el PDF | **Anulado** por la decisión #6 → C3.3 |
| 10 | "mínimo de pruebas con Vitest en Fase C" | No hay test runner, ni config, ni script `test`, ni CI | 0.3 |
| 11 | "Rollback: `.xlsx` en `legado/` + PITR" | El `.xlsx` se borró. Además `migrate_to_supabase.py:281` (`--reset`) hace `delete from requirements` que **cascadea a `activity_logs` y `document_versions`** | 0.5 + guardarraíl en 0.0 |
| 12 | §8 "grid CSS por semana/mes"; `CLAUDE.md` "grid por día" | `gantt-timeline.tsx` **no tiene grid ninguno**, solo dos etiquetas de eje | C1.3 |
| 13 | "edición inline de tareas" | El tipo `Tarea` (`types.ts:45-55`) **no tiene `id`** y `fase-stepper.tsx:76` usa el índice como key | C2.1 |
| 14 | §7: env vars de Supabase en Vercel | Ya corregido: hardcodeadas en `src/lib/supabase/server.ts:13-14` | 0.1 (documentar) |

**Dos bugs latentes que estas fases activan:**
- `src/app/requerimiento/[item]/page.tsx:63-69` — la 3ª query (tareas) está **fuera del try/catch** y
  **descarta su error**: un fallo de red se renderiza como "Sin detalle disponible". → C2.4.
- `src/lib/fases.ts:3-9` duplica verbatim `FASES_ORDEN` de `src/lib/planeacion-data.ts:27-33`. → 0.6.

---

## Convenciones para el ejecutor (leer antes de cualquier unidad)

- Rutas relativas a `C:\Users\Usuario 1\Documents\Tablero Requerimientos\dashboard-414`.
- **PowerShell 5.1**: no existen `&&`, `||`, `??`, ternario. Encadenar con `;` o `if ($?) { }`.
- `$env:PATH += ";C:\Program Files\nodejs"` al abrir la terminal (Node no está en PATH).
- `AGENTS.md` sigue vigente: **antes de usar cualquier API de Next, leerla en
  `node_modules/next/dist/docs/`**. Esta es Next **16.2.12** (release real, no canary), React 19.2.4.
- **Una unidad = una sesión = un commit.** No mezclar unidades. Cada unidad termina con
  `npm run typecheck`, `npm run lint`, `npm run test` limpios.
- Git: la rama local es `master` y trackea `origin/main`. **Los workflows de CI disparan sobre `main`.**
- Todo bloque marcado **[VERIFICAR EN VIVO]** es un supuesto NO confirmado. Si la verificación falla,
  **detenerse y reportar**, no improvisar.
- **Revalidación tras escribir: `refresh()` de `next/cache`.** Verificado en los docs: `updateTag` y
  `revalidateTag` solo invalidan datos etiquetados con `cacheTag`, que exige `'use cache'`, que exige
  `cacheComponents` activado — y aquí está apagado (`next.config.ts` vacío) con las 3 rutas en
  `force-dynamic`. **No hay caché que invalidar**; serían no-ops. Reevaluar solo si algún día se
  activa `cacheComponents` (lo cual rompería los `export const dynamic`).
- **Formularios:** `<form action={serverAction}>` + `useActionState` (**no** `useFormState`,
  renombrado) + `useFormStatus`. Sin `react-hook-form`. Sin librería de toast: el feedback va por el
  estado que devuelve `useActionState`.
- **Regla de seguridad no negociable (documentada en los docs de Next 16):** una Server Function es un
  POST a la ruta donde vive; un cambio de `matcher` puede quitarle cobertura al proxy sin aviso.
  **Toda Server Action empieza con `await requireAuth()` o `await requireAdmin()`**, aunque el proxy
  ya proteja la ruta. RLS es el backstop real.
- **En servidor usar siempre `auth.getUser()`, nunca `auth.getSession()`** (`getSession` no valida la
  cookie contra el servidor de Auth).

---

## Diseños de Claude Design entregados (carpeta `design/`)

| Archivo | Cubre | Estado |
|---|---|---|
| `design-system-auth.dc.html` | Tokens/paleta base del sistema de diseño | Base, ya integrada en `globals.css` (B.3) |
| `auth-dashboard-414.dc.html` | Login/recuperar/restablecer contraseña | Integrado (B.3) |
| `home-resumen-general.dc.html` | Rediseño visual del home (`/`, hoy `dashboard-client.tsx`) — agrega KPI "Reabiertos" y "Salud del proyecto" | **✅ Implementado** en la rama `fase-c` (`PLAN_IMPLEMENTACION_FASE_C.md`, unidad "C0" de ESE plan — no confundir con la C1/C2/C3 de este documento, que siguen pendientes). |
| `fase-c1-gantt-planeacion.dc.html` | Ver Unidad C1.3 arriba | **No implementa C1.3.** La rama `fase-c` sí agregó los rombos de hito y un indicador de texto para fecha estimada/no confirmada (unidad "C1" del otro plan), pero el resto de C1.3 (grid día/semana/mes, sticky, escala configurable) sigue sin hacer. Cubre parcialmente C1.3 (falta estimado/confirmado visual y sticky). |
| `fase-c-detalle-requerimiento.dc.html` | Ver Unidades C2.4 y C3.2 arriba | **Parcialmente implementado.** La rama `fase-c` construyó el acordeón de tareas y el registro de actividades completo con su modal (unidades "C2"/"C3" del otro plan) — pero **no** resolvió C2.4 (los 21 heurísticos siguen sin ser navegables, `esNavegable` intacto) ni C3.2 tal como está descrito aquí (la bitácora de este documento asume que C3.3 ya corrió el trigger de `executed_hours`, que sigue pendiente). |

Todos llegaron el 2026-08-09, después del cierre de B.4. Todos son maquetas estáticas con datos de
ejemplo hardcodeados (no leen Supabase) — sirven como especificación visual/de interacción para
integrar, no como código a copiar literal.

---

# FASE 0 — Fundaciones ✅ completa (2026-08-09)

Nada de B/C/D se ejecuta sin esto. La Fase B modifica RLS sobre datos de producción; sin migraciones
versionadas ni backup probado, es un cambio irreversible sin red de seguridad.

**Diseño original + bitácora de verificación real de las 7 unidades: ya cerrada, detalle no conservado.** Resumen:

| Unidad | Qué hizo | Cerrada |
|---|---|---|
| 0.0 | Verificación read-only de la BD real — conteo real 28 `requirements`/164 `requirement_tasks` (no 185) | 2026-08-07 |
| 0.1 | Supabase CLI + `supabase/migrations/` — gotchas: nunca `--linked`, siempre `--db-url`; siempre Session Pooler | 2026-08-07 |
| 0.2 | Tipos generados (`database.types.ts` vía `--project-id`), cero `as` sobre resultados de Supabase | 2026-08-07 |
| 0.3 | Vitest + CI (13 tests, GitHub Actions en verde, repo confirmado público) | 2026-08-07 |
| 0.4 | Robustez app-shell (`error`/`loading`/`not-found`), limpieza de vocabulario era-Excel | 2026-08-07 |
| 0.5 | Backup diario por GitHub Actions + ensayo de restauración real verificado (conteos coinciden) | 2026-08-09 |
| 0.6 | Andamiaje compartido (`slug.ts`, `estados.ts`, `fechas.ts`, `fases-orden.ts`, `zod`) | 2026-08-08 |

---

# FASE B — Supabase Auth + roles Admin/Viewer

**Precondición dura: 0.1, 0.2 y 0.5 completas (cumplida).** Esta fase modifica RLS sobre datos de producción.

## Decisiones de arquitectura (tomadas — no re-debatir en ejecución)

1. **`redirect('/login')`, no `unauthorized()`/`forbidden()`.** Verificado en
   `node_modules/next/dist/docs/.../unauthorized.md`: es `version: experimental` y exige
   `experimental.authInterrupts`. Además renderiza una 401 en vez de llevar al login, y no da retorno
   a la ruta original (`?next=`). Reevaluar `forbidden()` en C si aparecen rutas solo-Admin.
2. **`cacheComponents` se queda apagado.** Las 3 rutas dependen de `export const dynamic`. No tocar
   `next.config.ts` en esta fase.
3. **Rol vía tabla `profiles`, no custom claims en el JWT.** Consultable desde RLS y desde Server
   Components con la misma función.
4. **Email + password para ambos roles** (decisión #7). Mensaje de error **siempre genérico** ("Correo
   o contraseña incorrectos") para evitar enumeración de usuarios.
5. **La secret key (`sb_secret_…`) NUNCA entra al código, ni a Vercel, ni a GitHub Actions.** Toda
   operación administrativa corre **localmente desde PowerShell** leyendo `.env.local`. La app
   desplegada solo usa la anon key — que está diseñada para viajar al navegador y cuya protección real
   es RLS. **Adicional: rotar `SUPABASE_SECRET_KEY` en el Dashboard al cerrar la Fase B** (lleva
   tiempo en texto plano en `.env.local`, en una carpeta bajo sincronización de OneDrive).

## Unidades B.1–B.6 ✅ completas — Fase B cerrada

**Diseño original + bitácora de verificación real: ya cerrada, detalle no conservado (ver `supabase/RUNBOOK_AUTH.md` para la evidencia de seguridad).** Resumen:

| Unidad | Qué hizo | Cerrada |
|---|---|---|
| B.1 | Clientes SSR (`server.ts`/`proxy-client.ts`) + `src/proxy.ts` compatible con Next 16.2, sin tocar RLS | 2026-08-09 |
| B.2 | Tabla `profiles` + `is_admin()` sin recursión + `scripts/create_user.mjs` + 2 usuarios reales | 2026-08-08 |
| B.3 | `/login`, logout, recuperar/restablecer contraseña, `proxy.ts` exige sesión (alcance ampliado sobre el diseño original) | 2026-08-09 |
| B.4 | Flip de RLS a solo-autenticados: `projects`/`requirements`/`requirement_tasks` ya no son legibles con la anon key; trigger `updated_at` activado | 2026-08-09 |
| B.5 | `RoleGate` (Server Component) + indicador solo-Admin (`data-testid="admin-only"`) en el nav + tests de `session.ts` con `vi.mock` | 2026-08-09 |
| B.6 | Checklist de seguridad de 11 puntos contra producción (11/11 en verde, `supabase/RUNBOOK_AUTH.md`) + cierre de documentación | 2026-08-09 |

**Pendientes reales de B.3, ya resueltos** (el PO confirmó en la sesión de cierre de Fase B): el
redirect URL de `/auth/callback` en producción ya está whitelisteado y el flujo de recuperar
contraseña se probó en vivo en producción. **SMTP propio en Supabase sigue pendiente, pospuesto
explícitamente hasta después de cerrar Fase C.**

**Único paso operativo pendiente**: rotar `SUPABASE_SECRET_KEY` en el Dashboard de Supabase y
actualizar `.env.local` (acción manual del PO — ver `PLAN_CIERRE_FASE_B.md`).

**Fase C** (pantallas de escritura) — **✅ completa** (2026-08-10): Home,
Gantt visual (hitos) y Detalle (acordeón + registro de actividades)
implementados, mergeados a `main` (PR #9) y verificados en vivo, ver
`PLAN_IMPLEMENTACION_FASE_C.md` (ejecutado) y "Estado actual" de
`CLAUDE.md`. **Esas unidades no son las C1/C2/C3 de este documento** —las
unidades de abajo (Gantt de fechas reales, CRUD, bitácora de horas
ejecutadas) siguen pendientes tal cual están diseñadas.

---

# FASE C1 — Gantt real

> El problema completo: las tareas tienen `planned_start_date`/`planned_end_date` en NULL,
> `planeacion-data.ts:69-82` cae al fallback `start = end = due_date`, y `gantt-timeline.tsx:64-66`
> fuerza `ANCHO_MIN_PX = 14` → **todas las barras miden lo mismo**. El Gantt es una nube de puntos.

## Unidad C1.1 — Semillado de fechas planeadas (SQL one-off)

Implementa la decisión #5. **Meta:** que el PO no teclee 370 fechas; sembrar valores derivados de
datos reales y **marcar cuáles son estimados** para que la revisión sea dirigida.

**Pasos.**
1. Columna de procedencia — es lo que hace la unidad reversible y la UI honesta:
   ```sql
   alter table requirement_tasks
     add column planned_dates_confirmed boolean not null default false;
   ```
   `false` = estimada por el semillado; `true` = el PO la revisó y guardó desde C1.2.
2. Semillado en un solo `update` con CTEs, idempotente por `where planned_start_date is null`:
   - **Duración:** `least(20, greatest(1, ceil(coalesce(estimated_hours,0) / 6.0)))` — 6 h efectivas
     por día, mínimo 1, tope 20 para que unas horas mal cargadas no revienten la escala.
   - **Regla A (tarea con `due_date`)** — la mayoría: `planned_end_date = due_date`,
     `planned_start_date = due_date - (duracion - 1)`. La fecha límite ya es un dato real; solo le
     damos ancho hacia atrás.
   - **Regla B (sin `due_date`)**: encadenar por secuencia con
     `sum(duracion) over (partition by requirement_id order by phase_number, sort_order rows between
     unbounded preceding and 1 preceding)`. **Ancla** = `min(due_date)` de las tareas del
     requerimiento; si no hay, `requirements.deadline - 30`; si tampoco, `current_date`.
   - Comentar las 3 reglas en el SQL: el PO va a preguntar de dónde salió cada barra.
3. Reporte de verificación al pie: 0 tareas con fechas NULL; 0 con `end < start`; ninguna ventana
   absurda (`max(end) - min(start) > ~400 días` indica horas sucias).

**Aceptación.** Todas las filas con ambas fechas, ninguna invertida, `/planeacion` con barras de
anchos visiblemente distintos, `planned_dates_confirmed = false` en todas.

**Rollback** (exacto y seguro gracias al flag — **no destruye ediciones manuales**):
`update requirement_tasks set planned_start_date=null, planned_end_date=null where planned_dates_confirmed = false;`

**[VERIFICAR EN VIVO]** Query 5 de 0.0 debe dar 0. Verificar también que `estimated_hours` no es
masivamente NULL: si lo fuera, todo caería en `duracion = 1` y el semillado pierde valor → sustituir
por duraciones fijas por fase (Requerimientos 3, Diseño 5, Desarrollo 10, QA 4, Producción 1).

---

## Unidad C1.2 — Pantalla de planeación de fechas

**Decisión de diseño (firme): tabla editable inline por requerimiento, con guardado masivo.**
- *Arrastrar las barras del Gantt* — **descartado**. Es lo más costoso con diferencia (matemática
  puntero→fecha, snapping, táctil, deshacer, accesibilidad: el teclado no arrastra) para una tarea
  que, tras C1.1, es de **revisión** (ajustar quizá 30-50 filas), no de captura masiva.
- *Importar CSV / pegar* — **descartado por una razón concreta: no existe archivo de origen que
  importar.** El `.xlsx` se borró y las hojas Gantt ocultas ya no son accesibles. El CSV tendría que
  ser **tecleado a mano** en otra herramienta, más un parser, más mapeo de columnas, más reporte de
  errores por fila: todo el trabajo de la tabla más el parser, con peor feedback.
- *Tabla editable* — **elegida.** Reutiliza `<input type="date">` nativo (cero dependencias, teclado y
  locale gratis), un solo formulario por requerimiento, con contexto (nombre, fase, `due_date` de
  referencia) y un solo submit. Estimado: una sesión.

**Archivos.** `src/app/planeacion/[slug]/fechas/page.tsx` (Server Component, `requireAdmin()`),
`src/components/planeacion/tabla-fechas.tsx` (`"use client"`), `src/app/actions/tasks.ts`,
`src/lib/schemas/tasks.ts`, migración `rpc_set_planned_dates`. Modificar `planeacion-client.tsx`
(botón "Editar fechas", solo Admin vía `RoleGate`). shadcn a añadir: `table`, `label`.

**Pasos.**
1. **RPC para el guardado masivo.** **No usar `.upsert()`** de PostgREST: un upsert por `id` con
   columnas parciales es en realidad `insert ... on conflict`, y el insert fallaría por las columnas
   `not null` (`requirement_id`, `phase_number`, `phase_name`, `task_name`). Tampoco N `.update()` en
   serie. Una función SQL **`security invoker`** (para que RLS siga aplicando) que recibe `jsonb`,
   lo expande con `jsonb_to_recordset` y hace un `update ... from`, poniendo además
   `planned_dates_confirmed = true`. Se invoca con `supabase.rpc(...)`. Es **atómica**.
2. Schema zod: array de `{ id: uuid, inicio: date|null, fin: date|null }` con `.refine(fin >= inicio)`
   por fila y un `superRefine` que exija ambas o ninguna.
3. Formulario: una fila por tarea, agrupada por fase, con `name={"inicio:"+id}` / `name={"fin:"+id}`;
   la acción reconstruye el array recorriendo `formData.entries()`. Mostrar `due_date` como texto de
   referencia (editarlo es C2.2) y un indicador "estimado" cuando `planned_dates_confirmed === false`.
4. La acción: `requireAdmin()` → `safeParse` → si falla, **devolver** `{errores}` (no lanzar) → `rpc`
   → `refresh()`. **Sin `redirect`**: el PO se queda en la tabla iterando.

**Aceptación.** Editar 3 fechas y guardar → persisten, `planned_dates_confirmed` pasa a `true` en esas
3, el Gantt muestra las barras movidas. Una fecha fin anterior a la de inicio muestra error de campo y
**no guarda ninguna fila** (la RPC es atómica). Un Viewer no ve el botón ni puede POSTear la acción.

---

## Unidad C1.3 — Refinamiento de `gantt-timeline.tsx`

**Diseño ya disponible**: `design/fase-c1-gantt-planeacion.dc.html` (Claude Design, llegó 2026-08-09) —
zoom mensual/semanal, filtro con/sin consumo, barras por tarea + hitos, tooltip al hover, agrupación
por requerimiento. Cubre buena parte de los puntos 1/2/7 de abajo; **no** resuelve la distinción
estimado/confirmado (punto 6) ni el sticky de columna (punto 5) — señalarlo al PO si hace falta un
segundo encargo a Claude Design para esos dos puntos antes de ejecutar la unidad.

**Meta.** Convertir el timeline en un Gantt legible ahora que hay duraciones reales.

1. **Escala configurable** `"dia" | "semana" | "mes"` con `PX_POR_DIA` 20/6/2, estado en
   `planeacion-client.tsx`. Bajar `ANCHO_MIN_PX` de 14 a 4, solo como piso de visibilidad para tareas
   de 1 día (hoy enmascara la ausencia de duraciones).
2. **Grid día/semana/mes** (contradicción #12): columnas absolutas desde `[minFecha, maxFecha]`
   redondeado a inicio de semana/mes; líneas de mes más marcadas que las de semana; sombreado de fines
   de semana en escala "dia"; cabecera de dos filas (mes arriba, semana/día abajo) con el mismo ancho
   total que las barras.
3. **Marcador de hoy** — **debe ser Client Component** o usar `hoyLocal()` de `src/lib/fechas.ts`: el
   Server Component corre en UTC en Vercel y pintaría el marcador en el día equivocado durante 5 horas
   al día. Recomendación: componente cliente pequeño que recibe `minFecha` y `pxPorDia` y calcula el
   offset en el navegador — así siempre coincide con el reloj del PO.
4. **Agrupación por fase** con una **barra resumen** por fase (de `min(start)` a `max(end)`),
   colapsable, colapsadas por defecto salvo la fase en curso — necesario para que un requerimiento de
   ~47 tareas sea navegable.
5. **Scroll horizontal + etiquetas fijas.** Hoy la columna del nombre de tarea (`:74`, `w-48 shrink-0`)
   está **dentro** del contenedor con `overflow-x-auto`, así que se va con el scroll. Reestructurar:
   columna de etiquetas `sticky left-0 z-10 bg-card` con borde; solo el área de barras desplazable;
   cabecera de escala `sticky top-0`.
6. **Distinguir estimado de confirmado**: barras con `planned_dates_confirmed === false` en patrón
   rayado / opacidad reducida y `title` "Fecha estimada automáticamente — sin confirmar". Esto
   convierte el semillado de C1.1 en información en vez de en una mentira bonita.
7. **Tooltip útil**: nombre, estado, inicio–fin, duración en días, horas estimadas.

**Aceptación.** Barras de anchos distintos; hay grid y cabecera de mes; el marcador de hoy cae en la
columna correcta; al hacer scroll horizontal los nombres permanecen visibles; las 3 escalas se ven
razonables; en móvil (≤640px) no hay desbordamiento.

---

## Unidad C1.4 — Semáforo: distinguir vencido de próximo

Implementa la decisión #10. Corrige `src/lib/semaforo.ts:9`, donde `if (dias < 0 || dias <= 3)`
colapsa "venció hace 3 meses" con "vence pasado mañana" (y donde la primera condición es redundante).

1. `Semaforo` pasa a `"vencido" | "rojo" | "amarillo" | "verde" | "sin-fecha"`; `dias < 0` → `vencido`
   antes de los umbrales. **Umbrales 3/10 confirmados por el PO — no cambiarlos.**
2. Usar `hoyLocal()` de `src/lib/fechas.ts` como default en vez de `new Date()`.
3. Parámetro opcional `completada?: boolean`: **una tarea completada nunca debe pintarse vencida.**
4. Los tres `Record<Semaforo, string>` (`requerimiento-card.tsx`, `gantt-timeline.tsx`) **fallarán a
   compilar** al añadir el 5º valor — es el mecanismo deseado. Añadir un token `--status-vencido` en
   `globals.css` junto a los `--status-*` existentes (`:94-99`, `:136-141`) y su `--color-status-vencido`
   en el bloque `@theme` (`:49-55`); rojo más oscuro y desaturado.
5. Textos: `vencido` → "Fecha límite vencida"; `rojo` → "Fecha límite próxima (≤3 días)".

**Aceptación.** Tests cubren -100, -1, 0, 1, 3, 4, 10, 11 días y `null`; la card de un requerimiento
con `deadline` pasada muestra el punto de vencido; el PDF sigue imprimiendo igual.

**[VERIFICAR EN VIVO]** `select count(*) from requirements where deadline < current_date` — cuántos
pasan de rojo a vencido. Puede ser un cambio visual notable; avisar al PO antes de desplegar.

---

# FASE C2 — CRUD de requerimientos y tareas

## Unidad C2.1 — Estado de tarea: de texto libre a conjunto canónico

**Decisión firme: constreñir.** El código **ya se comporta como si fuera un enum** — `fases.ts:32` y
`fase-stepper.tsx:27` comparan `status.toLowerCase() === "completada"`. Con texto libre, un
"Completado" (masculino) o "completada " (con espacio) escrito desde el nuevo formulario
**des-completa silenciosamente una fase entera**: un bug de datos invisible entre 185 filas. Además un
`<Select>` es más rápido de usar que un campo de texto.

1. **Bloqueante**: la query 4 de la Unidad 0.0. El conjunto real es desconocido hoy (el script lo
   imprimió pero esa salida no se guardó). **No escribir el mapeo sin esa lista.**
2. Conjunto propuesto (ajustar al resultado): `Pendiente | En curso | Bloqueada | Completada |
   Cancelada`. `UPDATE` de normalización; cualquier valor no mapeado → revisar **uno por uno con el
   PO**, son pocos valores distintos.
3. `alter table ... add constraint ... check (status in (...))` — **después** del UPDATE, nunca antes.
4. `src/lib/estados-tarea.ts` con `ESTADOS_TAREA as const` y `estadoEsCompletada(s)` que normaliza
   (trim + lowercase + sin diacríticos). Sustituir los dos `toLowerCase() === "completada"`.
5. **Propagar `id` a `Tarea`** (contradicción #13): añadirlo al tipo, a `RequirementTaskRow`, al
   `select` y al mapeo de `fases.ts:47-57`; `key={idx}` → `key={t.id}`. **Sin esto no hay edición
   inline posible.**

**Rollback.** El CHECK se borra fácil, pero **la normalización de valores no es reversible sin PITR**:
guardar antes `create table _backup_status_tareas as select id, status from requirement_tasks;` y
dejar el `update ... from _backup_status_tareas` como script de reversa al pie de la migración.

---

## Unidad C2.2 — Server Actions de tareas + edición inline

Resuelve la contradicción #6.

1. **Reestructurar el stepper (cambio de comportamiento, no cosmético).** Hoy `fase-stepper.tsx:25-28`
   muestra solo las tareas de la fase `en-curso` y solo las no completadas — las de fases completadas
   y pendientes **no se renderizan en absoluto**. Para editar hay que poder verlas. Cambio: **cada
   fase se vuelve colapsable**, con conteo (`3/8 completadas`), expandida por defecto la fase en
   curso, y dentro **todas** sus tareas (las completadas atenuadas, no ocultas). Se preserva la
   lectura ejecutiva actual sin perder acceso al resto.
2. `FaseStepper` sigue siendo Server Component; recibe `editable: boolean` y renderiza
   `<TareaEditable>` en vez del `<li>` estático solo cuando es `true`. **Los Viewers no reciben el JS
   de edición.**
3. `tarea-editable.tsx`: en lectura es idéntico al `<li>` actual; un botón de lápiz lo pasa a
   `<form action={actualizarTarea}>` con `<Select>` de estado, `<input type="date">` para las 4
   fechas, `<input type="number" step="0.5">` para horas, `<textarea>` para blockers/notes/detail.
4. `actualizarTarea`: `requireAdmin()` → zod → `.update().eq("id", id)` → si se tocaron fechas
   planeadas, `planned_dates_confirmed = true` → `refresh()`.
5. `crearTarea` y `eliminarTarea` (con `alert-dialog` de confirmación — es la única acción destructiva
   de la fase).
6. **Ojo con la clave natural** `unique (requirement_id, phase_number, task_name)`: renombrar una
   tarea a un nombre existente en la misma fase, o moverla de fase, la viola → capturar el código
   Postgres `23505` y devolver "Ya existe una tarea con ese nombre en esta fase", no un 500.

---

## Unidad C2.3 — Crear y editar requerimiento

**Campos:** `code` (único por proyecto), `title`, `category`, `complexity`, `month_label`, `status`
(`<Select>` con los 5 valores vía `ESTADO_ES_A_DB`), `deadline`, `estimated_hours`, `billing_date`
(texto libre — es `text` a propósito), `notes`, `documentation_folder_url`, `dev_environment_url`,
`has_detail_tracking`, `parent_requirement_id`.
**`executed_hours` NO es editable** (se mueve solo vía bitácora — ver C3.3).

1. **`slug`**: se calcula con `slugify(code)` de 0.6, replicando lo que hizo la migración
   (`migrate_to_supabase.py:193` usa `slugify(item)`, e `item` es el `code`). Mostrarlo como campo
   **read-only derivado** con opción de editarlo a mano para colisiones. **Al editar, NO recalcular el
   slug automáticamente si cambia el `code`**: el slug está en la URL y romperlo invalida enlaces
   guardados; ofrecerlo como acción explícita con advertencia.
2. Validaciones zod: `code` no vacío; `deadline` válida u opcional; `estimated_hours >= 0`;
   `parent_requirement_id !== id` (auto-referencia); `status` dentro de `ESTADOS_DB`. Colisión de
   `code`/`slug` → `23505` → error de campo, no 500.
3. **Cambio de alcance** (decisión ya tomada por el PO: manual, sin wizard):
   `cerrarPorCambioDeAlcance(idViejo, idNuevo)` pone `status='CERRADO_POR_CAMBIO_ALCANCE'` en el viejo
   y `parent_requirement_id = idViejo` en el nuevo, en una sola acción. En el detalle del cerrado,
   banner de solo lectura "Reemplazado por [link]" (pura query). Esto es lo que hace visible por
   primera vez el 5º estado — depende de 0.6.
4. Tras crear/editar: `redirect` al detalle (no `refresh()` — hay navegación). `updated_at` se
   actualiza solo por el trigger de B.4.

**[VERIFICAR EN VIVO]** Si el `code` real usa el patrón `PREFIJO_HU####_...` (ver `CATEGORY_RE` en
`migrate_to_supabase.py:91`), decidir si el formulario deriva `category` automáticamente
(recomendado: derivar como sugerencia editable).

**Aceptación.** Crear un requerimiento de prueba → aparece en su bloque y su URL funciona; editarlo →
`updated_at` avanza; cerrarlo por cambio de alcance → aparece en la sección de cerrados y el nuevo
muestra el banner; `code` duplicado da error de campo. **Borrar el requerimiento de prueba al terminar.**

---

## Unidad C2.4 — Hacer alcanzables los 21 sin detalle + arreglar el drill-down

**Diseño ya disponible**: `design/fase-c-detalle-requerimiento.dc.html` (Claude Design, llegó
2026-08-09) — página de detalle con header + KPIs de horas, barra estimado/consumido por fase, stepper
de fases, tabla de tareas filtrable por área, y la sección de bitácora de C3.2 (ver abajo).

Implementa la decisión #10 y resuelve la contradicción #7 y el bug del error descartado.

1. `requerimiento-card.tsx:35` → eliminar `esNavegable`; **los 28 son clickeables**. Mantener el
   tratamiento visual atenuado (`bg-muted/40`) — sigue comunicando la distinción, pero ya no como
   callejón sin salida.
2. Mover el bloque de metadatos (`page.tsx:96-120`) **fuera** de la rama `fases !== null`: hoy un
   requerimiento sin detalle no muestra ni mes, ni complejidad, ni horas, solo el cartel "Sin detalle
   disponible". Ese cartel pasa a aviso secundario con botón "Añadir tareas" (Admin) que llama a
   `crearTarea` de C2.2.
3. Mover la 3ª query **dentro** del try/catch y **no descartar su error** (`:63-69`): distinguir "no
   hay tareas" (array vacío) de "falló la consulta" (banner). Hoy se renderizan idénticos.
   *(Si 0.4 ya extrajo `getRequerimientoDetalle`, esto ya está hecho — verificar y no duplicar.)*

---

## Unidad C2.5 — Reestructuración de `actions.ts` y componentes shadcn

**Ejecutar ANTES de C2.2**: reestructurar `actions.ts` cuando hay 1 acción cuesta minutos; cuando hay
8, es un refactor con riesgo.

Eliminar `src/app/actions.ts` → crear `src/app/actions/{ui,requirements,tasks,activity-logs,documents}.ts`.
`src/app/actions/` dentro de `app` es seguro: sin `page.tsx`/`route.ts` no genera rutas. Cada archivo
empieza con `"use server"` y **cada función exportada** con `requireAdmin()`.

**shadcn a añadir:** `table`, `label` (C1.2), `textarea`, `alert-dialog` (C2.2), `checkbox` (C2.3),
`dialog` (C3.2, D.3).

**Deliberadamente NO se añaden:**
- `calendar` + `popover` + date-picker → se usa `<input type="date">` nativo: un solo usuario Admin en
  escritorio; el nativo da teclado, locale y validación gratis, y funciona sin JS en un `<form action>`.
- `form` de shadcn → asume `react-hook-form`, que no se usa.
- `sonner`/`toast` → no garantizado en el registry Base UI; el feedback va por `useActionState`.

**Verificación previa obligatoria.** Antes de `npx shadcn add <x>`, comprobar que el componente existe
en el preset **Base UI "base-nova"** (`components.json:3`) — **la variante Base UI no tiene paridad
total con Radix**. Si falta alguno, escribirlo a mano sobre `@base-ui/react` siguiendo el patrón de
`src/components/ui/sheet.tsx` (ojo: Base UI usa `render={...}` en los triggers, como en
`planeacion-client.tsx:52-60`, **no** `asChild`).

---

# FASE C3 — Bitácora de actividad y horas ejecutadas

## Unidad C3.1 — `activity_logs`: `created_by` + RLS append-only

Resuelve las contradicciones #3 y #4, y hace que "append-only" sea **una propiedad de la base de
datos, no una convención**.

```sql
alter table activity_logs add column created_by uuid references auth.users(id);
create index idx_activity_logs_logged_at on activity_logs(requirement_id, logged_at desc);

-- Append-only por RLS: se definen SOLO insert y select.
-- La ausencia de policies de update/delete, con RLS habilitado, deniega por defecto.
create policy "read_authenticated" on activity_logs
  for select to authenticated using (true);
create policy "admin_insert" on activity_logs
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

-- Cinturón y tirantes, por si alguien añadiera una policy por error:
revoke update, delete on activity_logs from authenticated, anon;
```

**Notas de diseño.**
- `created_by` es **nullable a propósito**: el backfill de C3.3 crea filas de sistema sin autor. La UI
  muestra "Sistema (migración)" cuando es NULL.
- `with check (created_by = auth.uid())` impide registrar horas a nombre de otro.
- **No se escribe nunca una Server Action de update/delete para esta tabla**, ni siquiera privada. Una
  corrección es una entrada compensatoria con `hours_spent` negativo. `hours_spent` es `numeric(5,2)`
  **sin CHECK de positividad — eso es correcto y hay que dejarlo así**, porque las compensaciones lo
  necesitan. Documentarlo con `comment on column`.

**Aceptación.** Un Admin autenticado inserta; un `update`/`delete` falla **incluso siendo Admin**; un
anónimo no puede leer.

---

## Unidad C3.2 — Modal de bitácora + historial

**Diseño ya disponible**: la sección "Registro de actividades" de
`design/fase-c-detalle-requerimiento.dc.html` (ver C2.4) — tabla fecha/tipo/autor/horas/comentario. El
diseño la muestra de solo lectura; **falta el diseño del modal de registro** (punto 2 de abajo) — no
está cubierto todavía, encargarlo a Claude Design cuando se planifique esta unidad.

1. `registrarActividad`: `requireAdmin()` → zod (`event_type` ∈ los 5 del CHECK, `title` requerido,
   `hours_spent` numérico que **admite negativos**, `notes` opcional, `logged_at` con default hoy pero
   **editable** para registrar días pasados) → `insert` con `created_by` → `refresh()`.
2. Modal (`dialog`) desde el detalle, solo Admin: es el "Modal All-In-One" del roadmap — tipo de
   evento y horas en un solo paso.
3. `bitacora-historial.tsx` (Server Component): lista descendente por `logged_at` con tipo, título,
   horas (verde/rojo según signo), autor (o "Sistema (migración)") y notas colapsables. **Al pie, el
   total sumado — debe coincidir con `executed_hours` mostrado arriba**: es la verificación visual del
   invariante de C3.3.
4. **Sin botón de editar ni de borrar en ninguna fila.** En su lugar, "Registrar corrección" que
   preabre el modal con `hours_spent` negativo y título "Corrección de: <título original>". Así el
   camino de menor resistencia es el correcto.

---

## Unidad C3.3 — `executed_hours` → suma de la bitácora (columna + trigger)

Implementa la decisión #6. **Anula** la decisión del v1 (contradicción #9).

| Opción | Veredicto |
|---|---|
| **A. `sum()` al leer** (roadmap v1) | Descartada. 4ª query secuencial en `getDashboardData` (ya encadena 3), otra en el drill-down, otra en el PDF, y cambia la forma del `ultimoResultadoBueno` en caché. |
| **B. columna base + suma de deltas** | Descartada. El significado de `executed_hours` queda ambiguo para siempre y las compensaciones negativas se leen como incoherencias. |
| **C. columna denormalizada mantenida por trigger** | **Elegida.** `activity_logs` es el libro mayor y la única fuente de verdad; Postgres garantiza la consistencia. **Ventaja decisiva: el camino de lectura no cambia en absoluto** — `dashboard-data.ts`, `kpis.ts`, `requerimiento-card.tsx` (`overbudget`, `porcentajeAvance`), `kpi-strip.tsx` y `pdf-report.tsx` siguen idénticos, con **cero riesgo de regresión**. Además sobrevive a un `pg_dump` (relevante para el backup). |

**Ningún archivo de `src/` cambia en esta unidad** — esa es la señal de que la opción es correcta.

**Pasos (el orden es crítico).**
1. `create table _backup_executed_hours as select id, code, executed_hours from requirements;`
2. **Backfill**: una entrada por requerimiento con horas ≠ 0, con
   `title = 'Saldo inicial migrado'`, `event_type = 'OTRO'`, `logged_at = created_at`,
   `created_by = null`, y una nota que explique que no corresponde a una sesión de trabajo concreta.
   Se elige `'OTRO'` porque los 5 valores del CHECK son tipos de trabajo real y ninguno describe un
   saldo — **no añadir un 6º valor solo para esto**: contaminaría los filtros del historial para
   siempre. La distinción real la dan el título y el `created_by IS NULL`.
3. **Trigger de sincronización** `after insert or update or delete on activity_logs for each row`,
   `security definer` (para no depender de que el escritor tenga UPDATE sobre `requirements`), que
   recalcula `executed_hours = coalesce(sum(hours_spent), 0)` del requerimiento afectado
   (`coalesce(new.requirement_id, old.requirement_id)`). Se cubren update/delete **aunque RLS los
   prohíba**: el trigger debe seguir siendo correcto si alguien opera con `service_role` desde el
   SQL Editor.
4. **Verificación del invariante**: un `select ... group by ... having r.executed_hours is distinct
   from coalesce(sum(a.hours_spent),0)` debe devolver **0 filas**. Y comparar contra
   `_backup_executed_hours` — deben ser idénticos (el backfill es exactamente el valor previo).
5. `comment on column requirements.executed_hours is 'DERIVADA: suma de activity_logs.hours_spent,
   mantenida por trg_sync_executed_hours. NO escribir a mano.';`

**Aceptación.** Los 5 KPIs y todas las cards muestran **exactamente los mismos números** que antes
(comparar captura previa). Registrar 3h → la card y el KPI suben en 3 **sin ningún cambio de código de
lectura**. La query del invariante devuelve 0 filas. `overbudget` se sigue disparando bien.

**[VERIFICAR EN VIVO]** Que `activity_logs` está vacía antes del backfill (query 6 de 0.0) — si no, el
backfill **duplicaría horas**.

**⚠️ Este supuesto YA ES FALSO (2026-08-10).** `activity_logs` tiene datos reales en producción desde que
el Registro de actividades de la Fase C (PR #9) se desplegó — el backfill "una entrada por requerimiento
con `title = 'Saldo inicial migrado'`" no puede asumir la tabla vacía. Antes de ejecutar C3.3: decidir si
el backfill se salta para requerimientos que ya tienen actividad real, o si se distingue por otro criterio
(p. ej. solo backfillear si `executed_hours > 0` Y no hay ninguna fila de `activity_logs` para ese
`requirement_id` todavía). Ver también `supabase/migrations/20260810120000_c1_ext_horas_por_tarea.sql` —
la Unidad C1 agregó una extensión de horas ejecutadas *por tarea* (`activity_logs.task_id`,
`requirement_tasks.executed_hours`) fuera de este diseño de C3 (que opera solo a nivel de requerimiento);
no reimplementar ni contradecir esa extensión al ejecutar C3.1/C3.2/C3.3.

---

# FASE D — Documentos vigentes (SIN versionado)

> **Este diseño reemplaza por completo la Fase D del roadmap v1.** Por la decisión #9, **no hay
> versionado**: subir un documento nuevo **borra el anterior y lo reemplaza**. Desaparecen `is_latest`,
> `version`, el índice único parcial, el historial colapsable y la RPC transaccional de dos pasos que
> el v1 diseñaba. **Consecuencia aceptada explícitamente por el PO: no hay historial de versiones ni
> forma de recuperar un documento reemplazado** (más allá del backup diario de la Unidad 0.5).
>
> **Beneficio:** el cálculo de storage baja de ~1.3 GB a **~0.34 GB** (28 × 4 × 3 MB), holgadamente
> dentro del free tier de Supabase (1 GB). **La decisión bloqueante del v1 sobre pagar Pro / retener N
> versiones queda anulada — no hay que decidir nada.**

## Unidad D.1 — Esquema y bucket

**Verificar primero que `document_versions` está vacía** (query 6 de 0.0). Si lo está —y debe
estarlo—, `drop table` + `create table` es más limpio que encadenar `alter`.

```sql
drop table document_versions;

create table requirement_documents (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  document_name  varchar(255) not null,
  storage_path   text not null,
  file_name      text not null,
  file_size      bigint,
  mime_type      text,
  uploaded_by    uuid references auth.users(id),
  uploaded_at    timestamptz not null default now(),
  constraint requirement_documents_unico unique (requirement_id, document_name)
);
create index idx_requirement_documents_requirement on requirement_documents(requirement_id);

alter table requirement_documents enable row level security;
create policy "read_authenticated" on requirement_documents
  for select to authenticated using (true);
create policy "admin_write" on requirement_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

**Notas de diseño.**
- **Tabla renombrada a `requirement_documents`**: mantener el nombre `document_versions` sin versiones
  sería engañoso para cualquier sesión futura.
- `unique (requirement_id, document_name)` **es el invariante central**: un documento, una fila. Un
  documento del mismo nombre reemplaza al anterior por `upsert`, no duplica.
- `storage_path`, **no `file_url`**: el bucket es privado y sus URLs son firmadas y efímeras —
  almacenar una URL sería almacenar algo caducado.
- **Sí se conserva policy de `delete`** (a diferencia del v1): reemplazar implica borrar, y además el
  PO necesita poder quitar un documento obsoleto.
- **Bucket privado** `requirement-documents` (`public: false`), ruta
  `{project_slug}/{requirement_id}/{document_name_slug}/{file_name}` (`slugify` de 0.6; el prefijo de
  proyecto se conserva aunque hoy solo haya uno, coherente con el modelo multi-proyecto).
- Policies sobre `storage.objects` reflejando lo mismo.
  **[VERIFICAR EN VIVO]** que `is_admin()` es invocable desde las policies de `storage.objects` (está
  en `public`; puede requerir cualificar `public.is_admin()`).

## Unidad D.2 — Subida firmada + reemplazo

Flujo en dos pasos para que los bytes **no pasen por la Server Action** (que tiene límite de body):

1. `getUploadUrl({requirementId, documentName, fileName, fileSize, mimeType})`: `requireAdmin()` → zod
   → **tope de 20 MB** (mensaje sugiriendo el enlace de Drive para assets pesados) → construir
   `storage_path` → `createSignedUploadUrl(path)` → devolver `{path, token}`. **No escribe fila.**
2. El navegador sube con `uploadToSignedUrl(path, token, file)`. **Esto requiere el cliente browser de
   `@supabase/ssr`** (diferido en B.1) → crear `src/lib/supabase/client.ts` aquí.
3. `confirmarDocumento({...})`: `requireAdmin()` → **si ya existe fila para ese
   `(requirement_id, document_name)`, borrar el objeto anterior de Storage** (`storage.remove([viejo])`)
   → `upsert` de la fila con `on_conflict: "requirement_id,document_name"` → `refresh()`.
   **El orden importa**: borrar el objeto viejo solo **después** de que el nuevo subió correctamente.
4. `getDownloadUrl(id)`: `createSignedUrl(path, 60)` — URL efímera generada bajo demanda; **nunca se
   persiste una URL**.
5. **Modo de fallo conocido y aceptado**: si el paso 2 tiene éxito y el 3 falla (cierre de pestaña,
   red), queda un objeto huérfano en Storage sin fila. **No se sobre-ingeniera limpieza automática**;
   se documenta una query de barrido admin al pie de la migración (objetos de `storage.objects` sin
   `storage_path` correspondiente). El caso inverso —fila sin objeto— es imposible por el orden.

## Unidad D.3 — UI de documentos en el detalle

- Sección "Documentos": una fila por documento con nombre, archivo, quién y cuándo, y botón Descargar
  (invoca `getDownloadUrl` y abre la URL). **Eso es todo lo que hay que ver** — es la respuesta directa
  a "¿cuál es la versión vigente?".
- "Reemplazar" (Admin) por documento existente, y "Subir documento nuevo" (Admin) que pide el
  `document_name` — con un `datalist` de nombres ya usados en el proyecto: mitigación barata contra
  "Acta de reunión" vs "Acta Reunión" como documentos distintos.
- **Al reemplazar, un `alert-dialog` de confirmación explícito**: "Esto borra permanentemente el
  archivo anterior. Esta acción no se puede deshacer." — es obligatorio dado que no hay historial.
- Junto al botón de subida, enlace a `documentation_folder_url` etiquetado "Assets pesados (Drive)",
  para que la separación sea explícita en la UI y no una regla no escrita.
- Viewers ven la lista y descargan; **ningún control de escritura llega a su bundle** (`RoleGate`).

---

## Fuera de alcance (decisión deliberada — no proponerlo en sesiones futuras)

- **Selector multi-proyecto.** El modelo lo soporta y `src/lib/project.ts` centraliza el default, pero
  solo existe "Positiva Web 414". Se construye cuando exista un 2º proyecto real, no antes.
- **Filtros y selección del Gantt en la URL.** Hoy viven en `useState` local (no compartibles, se
  pierden al recargar). Reconocido como limitación; no priorizado.
- **Historial/versionado de documentos** (ver Fase D).
- **Notificaciones por email/push.** Siguen siendo pasivas: el PO entra a revisar.
- **Roles por proyecto.** Los roles son globales. Revisar solo si aparece un 2º proyecto con admins
  distintos; en ese punto `profiles` necesitaría `project_id` o una tabla `project_members`.
- **Activar `cacheComponents`.** Rompería los `export const dynamic = "force-dynamic"` de las 3 rutas.

---

## Orden de ejecución (mapa de sesiones)

```
0.0 → 0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.6        FUNDACIONES
        ↓
B.1 → B.2 → B.3 → [desplegar y verificar] → B.4 → B.5 → B.6      AUTH
        ↓
C1.1 → C1.2 → C1.3 → C1.4                       GANTT REAL
        ↓
C2.1 → C2.5 → C2.2 → C2.4 → C2.3                CRUD
        ↓
C3.1 → C3.2 → C3.3                              BITÁCORA Y HORAS
        ↓
D.1 → D.2 → D.3                                 DOCUMENTOS
```

**Notas de secuenciación (razones, no capricho):**
- **0.0 primero y es read-only**: bloquea a todas las demás. Sin sus 10 salidas, C2.1 y C1.1 no se
  pueden escribir correctamente.
- **0.5 (backup) antes de B.4**: B.4 es el primer cambio irreversible sobre datos de producción.
- **B.3 desplegado y verificado en producción antes de B.4** — ver la nota de secuenciación de B.4.
- **C2.5 antes que C2.2**: reestructurar `actions.ts` con 1 acción cuesta minutos; con 8, es riesgo.
- **C2.1 antes que C2.2**: la edición inline necesita el `id` en `Tarea` y el conjunto canónico.
- **C2.4 antes que C2.3**: no tiene sentido crear requerimientos si los que no tienen detalle siguen
  siendo inalcanzables.
- **C3.3 después de C3.2**: el backfill debe correr con la UI lista para explicar de dónde salen esas
  entradas.
- **C1 no depende de C2**: puede ejecutarse completa aunque C2 se posponga.

---

## Verificación end-to-end (aplica a toda ejecución de este roadmap)

- **Cada unidad** termina con `npm run typecheck`, `npm run lint`, `npm run test` limpios (recordar
  `$env:PATH += ";C:\Program Files\nodejs"`), un commit propio, y la actualización de la fila
  correspondiente en `ROADMAP_V2.md` + `CLAUDE.md`.
- **Cada migración** se aplica con `db push --dry-run` primero y lleva su bloque `-- ROLLBACK:`.
- **Fase 0**: CI en verde en GitHub; restauración del backup ensayada con conteos coincidentes.
- **Fase B**: los 11 ítems del checklist de B.6 pasan y su salida queda registrada con fecha.
- **Fase C1**: barras de anchos distintos, grid visible, marcador de hoy correcto, edición de fechas
  persistente, semáforo distinguiendo vencido.
- **Fase C2**: crear/editar/cerrar por cambio de alcance funcionan; los 28 requerimientos son
  navegables; nombres duplicados dan error amable, no 500.
- **Fase C3**: 2 entradas + 1 compensatoria → el total neto coincide con `executed_hours`; los KPIs
  muestran los mismos números que antes de la migración.
- **Fase D**: subir un documento, reemplazarlo, confirmar que el objeto anterior ya no está en el
  bucket y que la descarga del nuevo funciona; un Viewer no ve controles de subida.

---

## Riesgos y supuestos a verificar antes de ejecutar

| # | Supuesto | Dónde importa | Si falla |
|---|---|---|---|
| 1 | La contraseña de BD se puede obtener/resetear sin romper nada | 0.1, 0.5 | Plan B en 0.1; **0.5 queda bloqueada** — escalar al PO, no seguir en silencio |
| 2 | `migration repair --status applied` existe con esa sintaxis | 0.1 | Verificar con `--help`; alternativa: `db diff` sobre una copia |
| 3 | No hay Docker Desktop | 0.1, 0.5 | Si lo hay, `db pull` es mejor baseline y la restauración se ensaya en local |
| 4 | El host directo de Postgres es IPv6-only y CI necesita el pooler | 0.5 | Sin el pooler, el backup falla con timeout de conexión |
| 5 | El repo `jebb10/Tablero` podría ser público | 0.3, 0.5 | Si lo es: jamás commitear dumps (ya contemplado) y revisar que no haya nada sensible en el historial |
| 6 | **`@supabase/ssr` es compatible con `proxy.ts` de Next 16** | B.1 | **Es la incógnita mayor**: toda la doc upstream habla de `middleware.ts`. `createServerClient` es agnóstico, pero **probar B.1 aislada en local antes de seguir** |
| 7 | `security definer` evita la recursión en las policies de `profiles` | B.2 | Reescribir esas dos policies sin `is_admin()` |
| 8 | Desactivar el signup público es una opción del Dashboard | B.2 | Si no, trigger en `auth.users` que rechace inserciones no originadas por el admin API |
| 9 | `searchParams` es `Promise` en Next 16 | B.3 | Leer los docs; el `params` de `requerimiento/[item]` ya lo es |
| 10 | Los conteos de requerimientos/tareas | 0.5, B.4, C3.3 | Tomarlos de la query 9 de 0.0, **no asumir 28/185** |
| 11 | `estimated_hours` de tareas no es masivamente NULL | C1.1 | Sustituir la fórmula por duraciones fijas por fase |
| 12 | Los componentes shadcn existen en el preset Base UI "base-nova" | C1.2, C2.5 | Escribirlos a mano sobre `@base-ui/react` siguiendo `sheet.tsx` |
