# Plan unificado: Hotfix de horas + C2.2 + C2.4 + C2.3

> Copia de trabajo del plan aprobado el 2026-08-11 (fuente:
> `~/.claude/plans/quiero-que-me-hagas-rustling-biscuit.md`). Se ejecuta en
> una sola rama (`fase-c2-cierre`), un commit por unidad, probado completo
> en local antes de abrir un único PR — decisión explícita del PO para
> esta ronda, distinta del patrón "1 unidad = 1 rama = 1 PR" usado hasta
> `PLAN_EJECUCION_C2_C3.md`.

## Estado de ejecución

| Unidad | Estado |
|---|---|
| 0 — Hotfix horas huérfanas al eliminar tarea | ✅ Hecho (2026-08-11, commit `88ecc4a`) |
| 1 — C2.2 (edición inline de tareas, resto de campos) | ✅ Hecho (2026-08-11), verificado en vivo por el PO |
| 2 — C2.4 (navegabilidad de los 21 sin detalle) | ✅ Hecho (2026-08-11), verificado en vivo por el PO |
| 3 — C2.3 (crear/editar requerimiento) | ✅ Hecho (2026-08-11), verificado en vivo por el PO |

## Contexto

Quedan pendientes 3 unidades de la Fase C2 (CRUD) del Tablero 414 —
C2.2 (edición inline de tareas), C2.4 (navegabilidad de los 21
requerimientos sin detalle) y C2.3 (crear/editar requerimiento) — según
`PLAN_EJECUCION_C2_C3.md`. Además, el PO detectó en producción (probado
sobre el requerimiento "estandarización de mapas") que **eliminar una
tarea con horas registradas no reduce el contador de horas del
requerimiento**: las horas quedan huérfanas pero siguen sumando. Se decidió
tratar el bug como una unidad más, antes de C2.2, y unificar las 4 unidades
en una sola rama probada por completo en local contra el Supabase real
antes de abrir un único PR a producción.

**Causa raíz confirmada del bug** (verificado en código, no hipótesis):
`activity_logs.task_id` tiene `on delete set null`
(`supabase/migrations/20260810120000_c1_ext_horas_por_tarea.sql:15`). Al
borrar una tarea, Postgres solo pone `task_id = NULL` en sus
`activity_logs`, nunca las borra. El trigger de nivel-requerimiento
(`trg_activity_logs_executed_hours_requerimiento_iu`,
`20260811010000_c3_3_executed_hours_requerimiento.sql`) solo reacciona a
`INSERT`/`UPDATE`/`DELETE` sobre `activity_logs`; el `UPDATE` que dispara el
`SET NULL` no cambia `requirement_id` ni `hours_spent`, así que el `SUM`
recalculado da exactamente el mismo número — de ahí que el contador "no se
actualice". El PO decidió que las horas de una tarea eliminada **deben
restarse** del total, no permanecer.

## Unidad 0 — Hotfix: horas huérfanas al eliminar una tarea

**Migración nueva** `supabase/migrations/<timestamp>_fix_cascade_horas_tarea_eliminada.sql`:
1. Cambiar la FK de `activity_logs.task_id` de `on delete set null` a
   `on delete cascade` (drop constraint existente + `add constraint ...
   foreign key (task_id) references requirement_tasks(id) on delete
   cascade`). Con esto, borrar una tarea borra también sus filas de
   `activity_logs`, lo que sí dispara `trg_activity_logs_executed_hours_requerimiento_d`
   (y el de nivel-tarea, no-op porque la tarea ya no existe) y el `SUM` baja
   correctamente. Documentar bloque `-- ROLLBACK:` revirtiendo a `on delete
   set null`, siguiendo el patrón de las migraciones anteriores.
2. **Reparación de datos ya afectados en producción** (incluye
   "estandarización de mapas"): la migración de fusión
   (`20260811020000_c3_fusion_tarea_actividad.sql`) ya vinculó a una tarea
   real **todas** las filas de `activity_logs` con `phase_number is not
   null` que existían en ese momento. Por lo tanto, cualquier fila hoy con
   `phase_number is not null and task_id is null` es necesariamente una
   víctima de este bug (huérfana por un borrado posterior), no un dato
   legítimo — a diferencia de "Saldo inicial migrado"/histórico antiguo,
   que tiene `phase_number is null`. Antes de borrar: `select
   requirement_id, count(*), sum(hours_spent) from activity_logs where
   task_id is null and phase_number is not null group by requirement_id;`
   para mostrarte el impacto exacto por requerimiento. Con tu confirmación,
   `delete from activity_logs where task_id is null and phase_number is
   not null;` — el `DELETE` dispara el trigger existente y
   `requirements.executed_hours` baja solo, sin tocarlo a mano.
3. Verificación del invariante (mismo patrón que C3.3): `select ... having
   r.executed_hours is distinct from coalesce(sum(a.hours_spent),0)` debe
   dar 0 filas tras la reparación.

**Código** (`src/app/actions/tasks.ts`, función `eliminarTarea`):
- Antes de eliminar, consultar `sum(hours_spent)` de las `activity_logs`
  con ese `task_id` para poder avisar al Admin.
- Quitar el comentario que documenta el `on delete set null` (ya no aplica).

**UI** (`src/components/tarea-acciones-admin.tsx`, función `onEliminar`):
- Si la tarea tiene horas registradas, el `window.confirm` debe incluir
  cuántas horas se perderán: `¿Eliminar la tarea "X"? Se perderán N horas
  registradas. Esta acción no se puede deshacer.` — variante del mensaje
  actual, sin cambiar el mecanismo de confirmación.

## Unidad 1 — C2.2: edición inline de tareas (resto de campos)

Ya cubierto tras la fusión tarea/actividad: estado, fechas planeadas,
sumar horas (`tarea-acciones-admin.tsx`). Falta editar después de creada:
`task_name`, `due_date`, `notes`/`blockers`, `assignee` (campos de
`src/lib/types.ts`, tipo `Tarea`, hoy solo se fijan al crear en
`crearTarea`, `src/app/actions/tasks.ts`).

1. `actualizarTarea(taskId, formData)` en `src/app/actions/tasks.ts`:
   `requireAdmin()` → valida `taskName` no vacío y `dueDate` no vacío (zod,
   mismo criterio que `crearTarea`) → `.update({ task_name, due_date,
   notes, blockers, assignee }).eq("id", taskId)` → capturar `23505` (choca
   con `unique(requirement_id, phase_number, task_name)`) devolviendo error
   de campo, no 500 → `refresh()`.
2. Extender `tarea-acciones-admin.tsx` con un modo edición (lápiz → inputs
   de texto para nombre/fecha límite/notas/bloqueantes/asignado → guardar),
   reusando el patrón `useActionState` ya usado ahí para estado/fechas
   planeadas — no crear un componente nuevo separado si cabe en el mismo
   archivo sin quedar sobrecargado; si crece mucho, extraer
   `tarea-editable-form.tsx` como pieza hermana.
3. `src/components/tareas-por-fase.tsx`: fases colapsables con contador
   "N/M completadas" en el header (hoy solo `{n} tareas`), usando
   `estadoEsCompletada()` de `src/lib/estados-tarea.ts` sobre `fase.tareas`;
   atenuar visualmente (`opacity`/`text-muted-foreground`) las tareas con
   estado completado en la lista, sin ocultarlas — el colapsable/expandido
   por defecto ya existe (`abiertas` state), solo falta el contador y el
   atenuado.

## Unidad 2 — C2.4: navegabilidad de los 21 sin detalle

1. `src/components/requerimiento-card.tsx`: eliminar `esNavegable`/el
   `if (!esNavegable) return contenido` — todas las cards se envuelven en
   `<Link>`, conservando el estilo atenuado (`bg-muted/40`) para
   `!req.tieneDetalle`.
2. `src/app/requerimiento/[item]/page.tsx` + `src/lib/requerimiento-data.ts`:
   mover mes/complejidad/horas fuera de la rama `fases !== null` — un
   requerimiento sin `has_detail_tracking` debe mostrar igual su cabecera
   de metadatos. El cartel "Sin detalle disponible" pasa a aviso secundario
   con botón "Añadir tareas" (Admin) que dispara el mismo flujo de
   `crearTarea` ya existente (probablemente forzando `has_detail_tracking =
   true` en la primera tarea creada, o exponiendo un botón que primero
   marca esa columna — definir al ejecutar, según se comporte
   `getRequerimientoDetalle`).
3. `src/lib/requerimiento-data.ts` (líneas 60-66): el `select` de tareas no
   captura `error` (`const { data: tareas }`) — envolver esa query en su
   propio try/catch para distinguir "sin tareas" (array vacío, normal) de
   "falló la consulta" (mostrar banner de error, no cartel de "sin
   detalle").

## Unidad 3 — C2.3: crear y editar requerimiento

Tabla `requirements` (`supabase/migrations/20260101000000_baseline_fase_a.sql:25-51`),
13 campos editables desde el formulario: `code`, `title`, `category`,
`complexity`, `month_label`, `status`, `deadline`, `estimated_hours`,
`billing_date`, `notes`, `documentation_folder_url`, `dev_environment_url`,
`has_detail_tracking`, `parent_requirement_id`. `executed_hours` **no**
editable (derivada, solo vía bitácora).

1. `src/app/actions/requirements.ts` (hoy stub vacío):
   `crearRequerimiento`/`actualizarRequerimiento` — `requireAdmin()` → zod
   (`code` no vacío, `deadline` opcional válida, `estimated_hours >= 0`,
   `parent_requirement_id !== id`, `status` ∈ los 5 valores del CHECK real
   de `status`) → al crear, `slug = slugify(code)` (`src/lib/slug.ts`,
   read-only con override manual para colisiones); al editar, **nunca**
   recalcular `slug` aunque cambie `code`. Colisión `23505` → error de
   campo, no 500.

   **Ejecutado (2026-08-11)**: 12 campos, no 13 —
   `documentation_folder_url` se eliminó de la tabla en la migración de
   Fase C (`20260809192913_fase_c_campos_y_activity_logs.sql:12`), antes de
   que se escribiera este plan; excluido del formulario, no hay columna
   real donde guardarlo. Validación manual campo por campo (mismo patrón
   que `crearTarea`/`actualizarTarea`), no `zod.object` de la FormData
   completa. `cerrarPorCambioDeAlcance` no es una transacción real
   (limitación de supabase-js sin RPC dedicado): si el cierre del viejo
   falla tras crear el nuevo, se avisa en el mensaje de error en vez de
   dejarlo huérfano en silencio.
2. `category` se deriva como sugerencia editable con la misma regex que la
   migración original: `^([A-Za-zÁÉÍÓÚáéíóúñÑ]+)_HU\d+_`
   (`scripts/migrate_to_supabase.py:100`, función `category_from_code`) —
   portar a TS junto al formulario, no re-derivar en cada guardado.
3. `cerrarPorCambioDeAlcance(idViejo, datosNuevo)`: una sola Server Action
   que en una transacción pone `status = 'CERRADO_POR_CAMBIO_ALCANCE'` en
   el requerimiento viejo y crea el nuevo con `parent_requirement_id =
   idViejo`. Banner de solo lectura "Reemplazado por [link]" en el detalle
   del requerimiento cerrado (`src/app/requerimiento/[item]/page.tsx`).
4. Formulario nuevo (página `/requerimiento/nuevo` + reusar la misma UI en
   modo edición, o `/requerimiento/[item]/editar` — definir ruta exacta al
   ejecutar) con componentes shadcn ya instalados (`input`, `select`,
   `textarea`, `dialog`/`alert-dialog` para el flujo de cambio de alcance).
5. Tras crear/editar: `redirect()` al detalle del requerimiento (no
   `refresh()`, porque hay navegación de por medio).

## Flujo de trabajo acordado

- **Una sola rama** (`fase-c2-cierre`) con las 4 unidades como commits
  separados (hotfix, C2.2, C2.4, C2.3) para que el historial siga siendo
  legible unidad por unidad, aunque el PR final sea uno solo.
- Se prueba **todo en local** (`npm run dev`) contra el proyecto Supabase
  real (mismo flujo que las unidades anteriores) antes de pedir tu
  aprobación — incluye correr la migración del hotfix contra ese mismo
  proyecto (es el único Supabase que existe, no hay entorno de staging
  separado).
- **No se abre PR ni se hace push hasta que tú apruebes** explícitamente
  después de revisar el comportamiento en local.
- Cuando apruebes: un solo PR de esa rama a `main`, autoaprobado por ti
  como en las unidades anteriores.
- `npm run typecheck`, `npm run lint`, `npm run test` deben quedar limpios
  antes de pedir tu aprobación.

## Verificación end-to-end (antes de pedir aprobación)

- **Hotfix**: crear una tarea de prueba con horas registradas → confirmar
  que el contador del requerimiento sube → eliminar la tarea → confirmar
  que el diálogo avisa las horas que se perderán → confirmar que el
  contador baja exactamente esas horas. Correr la query de invariante tras
  la reparación de datos y confirmar 0 filas. Revisar en vivo que
  "estandarización de mapas" quedó con el número correcto.
- **C2.2**: editar nombre/fecha límite/notas de una tarea existente y
  confirmar que persiste tras recargar; confirmar que el contador
  "N/M completadas" y el atenuado de tareas completadas se ven bien en al
  menos 2 requerimientos con mezcla de estados.
- **C2.4**: confirmar que los 21 requerimientos sin detalle ahora navegan a
  su detalle, muestran mes/complejidad/horas, y el botón "Añadir tareas"
  crea la primera tarea correctamente.
- **C2.3**: crear un requerimiento nuevo (código único), editarlo, y
  ejecutar un "cambio de alcance" completo verificando el banner en el
  requerimiento cerrado. Confirmar que un `code` duplicado da error de
  campo, no 500. Confirmar que un Viewer no puede ejecutar ninguna de estas
  acciones (RLS + `requireAdmin()`).
