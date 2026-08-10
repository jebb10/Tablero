# Plan de ejecución — Fase C2 (CRUD) + Fase C3 (bitácora de horas), Tablero 414

> Copia de trabajo del plan aprobado el 2026-08-10 (fuente: `~/.claude/plans/luminous-spinning-thompson.md`).
> Se ejecuta unidad por unidad; marcar cada una como cerrada acá y en `ROADMAP_V2.md`/`CLAUDE.md`
> conforme se completa, para que una sesión futura sin memoria de esta conversación sepa por dónde va.

## Estado de ejecución

| Unidad | Estado |
|---|---|
| Paso 0 (housekeeping `.env.local`) | ✅ Hecho (2026-08-10) |
| C2.1 | ✅ Hecho (2026-08-10, PR #12) |
| C2.5 | ⬜ Pendiente — **siguiente unidad a ejecutar** |
| C2.2 | ⬜ Pendiente |
| C2.4 | ⬜ Pendiente |
| C2.3 | ⬜ Pendiente |
| C3.1 | ⬜ Pendiente |
| C3.2 | ⬜ Pendiente |
| C3.3 | ⬜ Pendiente |

**Fuera de plan, resuelto en el camino (2026-08-10, PR #11, rama `fix-lint-c1`, mergeado antes de
C2.1)**: `npm run lint` estaba roto en `main` desde el PR #10 (Unidad C1) por reglas nuevas de
`eslint-config-next`/`eslint-plugin-react-hooks` (`react-hooks/set-state-in-effect`,
`react-hooks/immutability`) resueltas por el rango `^` en `package.json`. Sin cambio de
comportamiento — ver el PR para el detalle. Si una sesión futura ve lint roto de nuevo, no asumir que
es este mismo problema sin verificar primero.

## Contexto

`ROADMAP_V2.md` ya trae el diseño detallado de C2 y C3 desde el 2026-08-06, pero quedó escrito antes
de que se ejecutara la Unidad C1 (Gantt real, cerrada 2026-08-10, PR #10) y antes de que se desplegara
el Registro de Actividades de Fase C (PR #9) — ambos introdujeron hechos nuevos que el diseño original
no contemplaba: C1 ya agregó una extensión de horas ejecutadas **por tarea** (fuera del diseño de C3,
que solo pensaba en el nivel de requerimiento), y `activity_logs` ya tiene datos reales en producción
(el diseño de C3.3 asumía la tabla vacía antes del backfill).

Este plan es el resultado de un cuestionario de 20 preguntas al PO (2026-08-10) para: (1) decidir el
orden y alcance real de esta ronda de trabajo, (2) resolver puntos marcados `[VERIFICAR EN VIVO]` en
el roadmap, y (3) conciliar el diseño original de C3 con lo que C1 ya construyó. El objetivo es que
cada unidad pueda ejecutarse de punta a punta sin volver a preguntar nada ya decidido acá.

**Alcance de esta ronda: únicamente Fase C2 + Fase C3. Fase D (documentos) queda fuera por completo
— decisión explícita del PO, sin fecha de retoma.** Sin plazo externo que condicione el orden.

---

## Decisiones tomadas en el cuestionario (no volver a preguntar)

| # | Decisión |
|---|---|
| 1 | Orden: **C2 completo primero, luego C3**. Cadencia estricta: **1 unidad = 1 sesión = 1 commit**, sin mezclar. |
| 2 | Flujo de git: **rama + PR por unidad** (mismo patrón de B.1–C1), autoaprobado por el PO. |
| 3 | C2.1 (normalizar `status` de tarea): **correr primero la consulta real** de valores distintos en producción antes de escribir el mapeo — no asumir el conjunto propuesto sin verificar. |
| 4 | C2.2: confirmado el cambio de comportamiento del stepper — fases colapsables, **todas** las tareas visibles (completadas atenuadas, no ocultas), conteo tipo "3/8". |
| 5 | C2.3: flujo de "cambio de alcance" (cerrar viejo + crear nuevo enlazado) **vigente tal cual**. Slug: se deriva de `code` al crear, **nunca se recalcula automáticamente al editar** el `code`. `category` se **deriva como sugerencia editable** desde el patrón del `code` (verificar el patrón real antes de escribir la derivación). |
| 6 | C2.4: los 21 requerimientos sin detalle se vuelven navegables, con aviso secundario "Sin detalle disponible" + botón "Añadir tareas" (Admin) — tal cual diseñado. |
| 7 | C2.5: verificación de componentes shadcn en el preset Base UI se hace **en el momento de C2.5**, no antes. |
| 8 | C3.1: `activity_logs` **append-only estricto** — nunca hay Server Action de update/delete, ni para Admin. Una corrección es una entrada nueva con horas negativas. |
| 9 | C3.2: **verificar el CHECK real de `event_type`** antes de construir el formulario — ya verificado en el código (ver abajo), no hace falta consulta a producción. |
| 10 | **C3 se integra con la extensión de C1**: una sola bitácora que sirve para los dos niveles — el modal permite asociar la actividad opcionalmente a una tarea (`task_id` opcional) o dejarla a nivel de requerimiento. El trigger de C1 (`trg_activity_logs_executed_hours_tarea_*`) ya soporta `task_id`; el trigger de C3.3 debe convivir con él, no duplicarlo. |
| 11 | C3.3 (backfill de horas iniciales): el supuesto de "`activity_logs` vacía" ya es falso. Criterio de backfill: **crear "Saldo inicial migrado" únicamente para requerimientos con `executed_hours > 0` Y sin ninguna fila en `activity_logs` todavía** (a nivel de requerimiento, `task_id is null`) — evita duplicar horas donde ya hay actividad real cargada. |
| 12 | La lista de "Fuera de alcance" del roadmap (selector multi-proyecto, filtros de Gantt en URL, historial de documentos, notificaciones, roles por proyecto, `cacheComponents`) **sigue vigente sin cambios**. |
| 13 | `SUPABASE_SECRET_KEY` en Supabase Dashboard: **ya rotada por el PO**. Pendiente solo un housekeeping local (ver "Paso 0" abajo). |
| 14 | El modal de bitácora de C3.2 (falta maqueta de Claude Design) se construye directamente con los componentes shadcn ya disponibles — **no se encarga una maqueta nueva**. |
| 15 | Tope de documentos (20 MB) y todo lo demás de Fase D: **no aplica**, fuera de alcance de esta ronda. |

## Hechos ya verificados en el código (no re-verificar)

- `activity_logs.event_type` CHECK real (`supabase/migrations/20260101000000_baseline_fase_a.sql:89-92`):
  `'SEGUIMIENTO' | 'PRESENTACION_FLUJO' | 'GESTION_DOCUMENTAL' | 'REFINAMIENTO_TECNICO' | 'OTRO'`.
- `requirement_tasks.status` (`:70`) es `varchar(50)` **sin CHECK**, default `'Pendiente'` — texto libre,
  de ahí el bloqueo de C2.1: el conjunto real de valores no se puede leer del esquema, solo de los datos.
- `activity_logs.task_id` y el trigger `trg_activity_logs_executed_hours_tarea_*` ya existen
  (`supabase/migrations/20260810120000_c1_ext_horas_por_tarea.sql`) — C3.1/C3.3 deben leer esta
  migración completa antes de tocar la tabla, para no pisar el trigger de C1.

---

## Paso 0 (housekeeping, antes de abrir la primera unidad)

`.env.local` tiene la `SUPABASE_SECRET_KEY` vieja en la línea 4 (la que el PO ya rotó en el Dashboard,
por lo tanto inválida) y una línea suelta al final con la key nueva, mal formateada (`sb_secret_key =
...`, con espacios y minúscula — `node --env-file` no la carga así). Corregir el nombre/formato de esa
variable (sin cambiar el valor) para que los scripts locales vuelvan a poder autenticarse contra
Supabase con la key vigente.

## Unidad C2.1 — Estado de tarea: de texto libre a conjunto canónico

**Consulta real ya corrida en producción (2026-08-10)**, 165 filas:
`Completada` (148), `En curso` (9), `Pendiente` (5), `No iniciada` (3). Sin variantes de mayúsculas ni
espacios. `Bloqueada`/`Cancelada` (del set propuesto en el roadmap) no existen en los datos hoy.

**Decisiones del PO sobre el mapeo (2026-08-10)**:
- `Pendiente` y `No iniciada` son **estados distintos**, se conservan ambos por separado (no fusionar).
- `Bloqueada` y `Cancelada` **se incluyen igual** en el CHECK, para uso futuro desde el formulario de
  C2.2 aunque hoy no haya ninguna tarea en esos estados.
- **Conjunto canónico final (6 valores)**: `Pendiente | No iniciada | En curso | Completada | Bloqueada
  | Cancelada`. Como los 4 valores reales ya coinciden exactamente con nombres canónicos, **no hace
  falta ningún `UPDATE` de normalización** — se salta directo al `CHECK constraint`.

1. `alter table requirement_tasks add constraint requirement_tasks_status_check check (status in
   ('Pendiente','No iniciada','En curso','Completada','Bloqueada','Cancelada'));` — sin UPDATE previo
   (ya no hace falta, ver arriba). Igual documentar `-- ROLLBACK: alter table requirement_tasks drop
   constraint requirement_tasks_status_check;`.
2. `src/lib/estados-tarea.ts`: `ESTADOS_TAREA as const` (los 6 valores) + `estadoEsCompletada(s)` (trim
   + lowercase + sin diacríticos, por robustez aunque hoy los datos ya estén limpios). Reemplazar los
   dos `toLowerCase() === "completada"` existentes (`src/lib/fases.ts`, y el componente de fases vigente
   — verificar si sigue siendo `fase-stepper.tsx` o ya es `tareas-por-fase.tsx` de Fase C).
3. Propagar `id` a `Tarea`: tipo en `src/lib/types.ts`, `RequirementTaskRow`, el `select` de
   `src/lib/requerimiento-data.ts`, y el mapeo de `src/lib/fases.ts` — cambiar cualquier `key={idx}` por
   `key={t.id}`. Esto es requisito duro de C2.2 (sin `id` no hay edición inline).

**Aceptación**: build/typecheck/lint/test limpios; el CHECK constraint rechaza un valor fuera del
conjunto; los 164 registros existentes pasan el CHECK sin excepción manual sin resolver.

---

## Unidad C2.5 — Reestructuración de `actions.ts` (ejecutar antes de C2.2)

1. Eliminar `src/app/actions.ts` → crear `src/app/actions/{ui,requirements,tasks,activity-logs}.ts`
   (sin `documents.ts`, Fase D fuera de alcance). Cada archivo con `"use server"`, cada función
   exportada empieza con `requireAdmin()` (o `requireAuth()` si aplica a lectura autenticada).
2. Verificar en el preset Base UI "base-nova" (`components.json`) que existen `table`, `label`,
   `textarea`, `alert-dialog`, `checkbox`, `dialog` antes de `npx shadcn add`. Si falta alguno,
   escribirlo a mano sobre `@base-ui/react` siguiendo el patrón de `src/components/ui/sheet.tsx`
   (`render={...}`, no `asChild`).

---

## Unidad C2.2 — Server Actions de tareas + edición inline

1. Reestructurar el componente de fases (hoy `tareas-por-fase.tsx`, reemplazo de `fase-stepper.tsx`
   según Fase C — **verificar el nombre/estado real del componente antes de tocarlo**, el roadmap
   original fue escrito contra `fase-stepper.tsx`, que ya no existe): cada fase colapsable, conteo
   "N/M completadas", expandida por defecto la fase en curso, todas las tareas visibles (completadas
   atenuadas).
2. Server Component recibe `editable: boolean` (via `RoleGate`/`getCurrentProfile()`), renderiza
   `<TareaEditable>` en vez del ítem estático solo si `true`.
3. `tarea-editable.tsx`: lectura idéntica al ítem actual; lápiz → `<form action={actualizarTarea}>`
   con `<Select>` de estado (usando `ESTADOS_TAREA` de C2.1), `<input type="date">` para las 4 fechas,
   `<input type="number" step="0.5">` para horas, `<textarea>` para notas/bloqueantes.
4. `actualizarTarea`: `requireAdmin()` → zod → `.update().eq("id", id)` → si se tocan fechas
   planeadas, `planned_dates_confirmed = true` → `refresh()`.
5. `crearTarea`/`eliminarTarea` con `alert-dialog` de confirmación. Capturar el código Postgres
   `23505` (viola `unique(requirement_id, phase_number, task_name)`) → devolver error de campo, no 500.

---

## Unidad C2.4 — Hacer alcanzables los 21 sin detalle + arreglar el drill-down

1. `requerimiento-card.tsx`: eliminar `esNavegable` — los 28 son clickeables, mantener el atenuado
   visual (`bg-muted/40`).
2. Mover el bloque de metadatos fuera de la rama `fases !== null` en la página de detalle: un
   requerimiento sin tareas debe mostrar igual mes/complejidad/horas. El cartel "Sin detalle
   disponible" pasa a aviso secundario con botón "Añadir tareas" (Admin, llama a `crearTarea`).
3. Verificar si la 3ª query (tareas) ya está dentro de un try/catch propio en
   `src/lib/requerimiento-data.ts` (posiblemente ya resuelto en Fase 0.4/Fase C) — si no, moverla
   dentro y distinguir "sin tareas" (array vacío) de "falló la consulta" (banner).

---

## Unidad C2.3 — Crear y editar requerimiento

1. **Verificar primero** el patrón real de `code` (`CATEGORY_RE` en `migrate_to_supabase.py:91`)
   contra los 28 códigos reales, para la derivación de `category` como sugerencia editable.
2. Formulario con los campos listados en `ROADMAP_V2.md` §C2.3 (`code`, `title`, `category`,
   `complexity`, `month_label`, `status`, `deadline`, `estimated_hours`, `billing_date`, `notes`,
   `documentation_folder_url`, `dev_environment_url`, `has_detail_tracking`, `parent_requirement_id`).
   `executed_hours` no editable (se mueve solo vía bitácora, C3).
3. `slug`: derivado de `code` al crear (`slugify()` de `src/lib/slug.ts`), read-only con opción de
   editar a mano para colisiones; **no se recalcula al editar `code`**.
4. Validaciones zod: `code` no vacío, `deadline` válida u opcional, `estimated_hours >= 0`,
   `parent_requirement_id !== id`, `status` dentro de `ESTADOS_DB`. Colisión `23505` → error de campo.
5. `cerrarPorCambioDeAlcance(idViejo, idNuevo)`: pone `status='CERRADO_POR_CAMBIO_ALCANCE'` en el
   viejo, `parent_requirement_id = idViejo` en el nuevo, una sola acción. Banner "Reemplazado por
   [link]" de solo lectura en el detalle del cerrado.
6. Tras crear/editar: `redirect` al detalle (no `refresh()`, hay navegación).

**Aceptación C2 completa**: crear/editar/cerrar por cambio de alcance funcionan; los 28 requerimientos
son navegables; nombres duplicados dan error amable, no 500; edición inline de tareas persiste.

---

## Unidad C3.1 — `activity_logs`: RLS append-only (ya con `created_by` desde Fase C)

`created_by` y las policies de `select`/`insert` **ya existen** desde
`20260809192913_fase_c_campos_y_activity_logs.sql` — verificar qué falta realmente contra esa
migración antes de reescribir política por política. Lo que sí falta, según ese archivo:
`revoke update, delete` explícito (cinturón y tirantes) si no está ya, e índice
`idx_activity_logs_logged_at (requirement_id, logged_at desc)` si no existe.

**No agregar Server Action de update/delete** para esta tabla bajo ninguna circunstancia (decisión #8).

---

## Unidad C3.2 — Modal de bitácora + historial

1. `registrarActividad`: `requireAdmin()` → zod (`event_type` ∈ los 5 valores reales verificados
   arriba, `title` requerido, `hours_spent` numérico que admite negativos, `notes` opcional,
   `logged_at` con default hoy pero editable) → además **`task_id` opcional** (decisión #10: permite
   asociar la actividad a una tarea específica del requerimiento, reutilizando el trigger de C1) →
   `insert` con `created_by` → `refresh()`.
2. Modal (`dialog` de shadcn) desde el detalle, solo Admin vía `RoleGate`. Selector de tarea opcional
   (dropdown con las tareas del requerimiento, "Sin tarea específica" por defecto).
3. `bitacora-historial.tsx`: lista descendente por `logged_at`, tipo, título, horas (verde/rojo según
   signo), autor (o "Sistema (migración)" si `created_by is null`), tarea asociada si la hay, notas
   colapsables. Total al pie debe coincidir con `executed_hours` del requerimiento.
4. **Sin editar/borrar ninguna fila** — botón "Registrar corrección" preabre el modal con
   `hours_spent` negativo y título "Corrección de: <título original>".

---

## Unidad C3.3 — Backfill de `executed_hours` a nivel de requerimiento

**Ajustado respecto al diseño original del roadmap** por la decisión #11 (el supuesto de tabla vacía
ya es falso).

1. `create table _backup_executed_hours as select id, code, executed_hours from requirements;`
2. **Backfill condicionado**: una entrada "Saldo inicial migrado" (`event_type = 'OTRO'`,
   `task_id = null`, `created_by = null`, `logged_at = created_at`) **solo** para requerimientos
   donde `executed_hours > 0` **y** no exista ya ninguna fila en `activity_logs` con
   `requirement_id` igual (sin importar `task_id`) — evita duplicar horas donde ya hay actividad real.
3. Trigger de sincronización a nivel de requerimiento (`after insert or update or delete on
   activity_logs for each row`, `security definer`) que recalcula
   `executed_hours = coalesce(sum(hours_spent), 0)` — **debe convivir con el trigger de C1**
   (`trg_activity_logs_executed_hours_tarea_*`, que opera sobre `requirement_tasks.executed_hours`);
   no reemplazarlo ni duplicar lógica, son dos triggers sobre la misma tabla actuando en columnas
   distintas.
4. Verificación del invariante: `select ... having r.executed_hours is distinct from
   coalesce(sum(a.hours_spent),0)` debe devolver 0 filas; comparar contra
   `_backup_executed_hours` para las filas que NO recibieron backfill (deben quedar iguales) y
   documentar cuáles sí lo recibieron.
5. `comment on column requirements.executed_hours is 'DERIVADA: suma de activity_logs.hours_spent,
   mantenida por trg_sync_executed_hours. NO escribir a mano.';`

**Aceptación C3 completa**: los KPIs y cards muestran los mismos números que antes del backfill para
los requerimientos que ya tenían actividad real; los que recibieron backfill muestran el mismo
`executed_hours` de antes, ahora como una entrada explicable en su bitácora; registrar 3h sube la
card y el KPI en 3 sin cambios en el código de lectura; la query del invariante da 0 filas.

---

## Orden de ejecución final

```
Paso 0 (housekeeping .env.local)
  ↓
C2.1 → C2.5 → C2.2 → C2.4 → C2.3        FASE C2 (CRUD)
  ↓
C3.1 → C3.2 → C3.3                      FASE C3 (BITÁCORA Y HORAS)
```

## Verificación end-to-end

- Cada unidad: `npm run typecheck`, `npm run lint`, `npm run test` limpios, rama propia, PR
  autoaprobado por el PO, merge a `main`, actualización de la fila correspondiente en
  `ROADMAP_V2.md` + `CLAUDE.md`.
- Cada migración: `db push --dry-run` primero, bloque `-- ROLLBACK:` documentado.
- Fase C2: crear/editar/cerrar por cambio de alcance funcionan en producción; los 28 requerimientos
  navegables; duplicados dan error de campo, no 500; edición inline de tarea persiste y respeta RLS
  (Viewer no puede POSTear ninguna acción).
- Fase C3: 2 entradas + 1 compensatoria dan el total neto correcto; los KPIs no cambian para
  requerimientos con actividad real preexistente; el backfill es auditable en el historial.
