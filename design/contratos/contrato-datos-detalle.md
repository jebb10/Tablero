# Contrato de datos — Detalle de requerimiento (`/requerimiento/[item]`)

Reescrito el 2026-08-11 para reflejar la implementación real (el contrato anterior describía el
mockup previo a la Fase C y ya no correspondía al código). Fuente de verdad del esquema:
`src/lib/supabase/database.types.ts` + `supabase/migrations/`. Fuente de verdad de la lógica:
`src/lib/requerimiento-data.ts`, `src/lib/fases.ts`, `src/lib/actividades-data.ts`,
`src/app/requerimiento/[item]/page.tsx`.

Regla de rol: el Viewer ve toda la pantalla en modo solo lectura. Los controles de escritura
(botón "Editar"/"Cambio de alcance" en la cabecera, "Añadir tarea"/"Registrar horas"/edición
inline por tarea, campo de fecha límite de fase) se ocultan vía `RoleGate` — solo Admin.

## Cabecera e información general

| Elemento visual | Origen | Notas |
| --- | --- | --- |
| Código, estado (badge) | `requirements.code`, `requirements.status` → `dbAEstado()`. | |
| Botones "Editar"/"Cambio de alcance" (solo Admin) | — | Enlazan a `/requerimiento/[item]/editar` y `/requerimiento/[item]/cambio-de-alcance`. |
| Banner "Reemplazado por [link]" | `requirements.parent_requirement_id` de OTRO requerimiento apuntando a este + su `status = CERRADO_POR_CAMBIO_ALCANCE`. | Solo aparece si este requerimiento fue cerrado por cambio de alcance. |
| Título, descripción | `requirements.title`, `requirements.description` (nullable). | |
| Mes, complejidad (badges) | `requirements.month_label`, `requirements.complexity`. | |
| Cliente/Stakeholder, Asignados | `requirements.client_stakeholder` (nullable), `requirements.assignees` (`text[]`, join con coma). | |

## KPIs de horas

| Elemento visual | Origen | Notas |
| --- | --- | --- |
| Horas estimadas / consumidas / restantes | `requirements.estimated_hours`, `requirements.executed_hours` (derivada por trigger desde `activity_logs`, no editable a mano), resta calculada en el cliente. | |

## Tareas por fase (acordeón)

`TareasPorFase` (`src/components/tareas-por-fase.tsx`). Para este PO, **"tarea" y "actividad" son
el mismo concepto** desde la fusión del 2026-08-11 — no hay dos flujos separados. Desde el
refinamiento del 2026-08-12 (PR #25), esta es la **única** pantalla de edición de tareas/fechas —
la antigua `/planeacion/[requerimiento]/editar` (que usaba este mismo componente) se eliminó; desde
Planeación se llega aquí con el botón "Detalle". El encabezado de cada fase ahora también muestra
horas estimadas/consumidas de la fase, y cada tarea lleva borde naranja institucional si está "En
curso" o rojo si está "Bloqueada" (conviven con la advertencia ⚠ de la fila de abajo).

| Elemento visual | Origen | Notas |
| --- | --- | --- |
| Agrupación por las 5 fases reales, expandible/colapsable | `requirement_tasks.phase_number`/`phase_name` vía `agruparPorFase()` (`src/lib/fases.ts`). | Fases con tareas no completadas abiertas por defecto; `completada` colapsada. Contador "N/M completadas" por fase. |
| Fecha límite de fase (encabezado de cada fase) | Tabla `requirement_phase_deadlines` (independiente de las tareas), vía `FaseFechaLimiteForm` (solo Admin). | Se dibuja también como hito propio en el Gantt de `/planeacion`. |
| Botón "Añadir tarea" (solo Admin) | `AgregarTareaDialog` → Server Action `crearTarea()`. | Nombre, fecha límite (**obligatoria** — sin fecha, la tarea es invisible en el Gantt), fechas planeadas y horas consumidas iniciales, todo opcional salvo nombre/fecha límite. |
| Nombre, detalle, estado, asignado de la tarea | `requirement_tasks.task_name`/`detail`/`status`/`assignee`. | `status` es un `CHECK` de 6 valores canónicos (`estados-tarea.ts`). |
| Fecha límite / fechas planeadas de la tarea | `requirement_tasks.due_date`, `planned_start_date`/`planned_end_date` (+ `planned_dates_confirmed`). | |
| Horas estimadas / horas consumidas de la tarea | `requirement_tasks.estimated_hours`, `requirement_tasks.executed_hours` (derivada por trigger desde `activity_logs.task_id`, no editable a mano). | |
| Advertencia ⚠ bajo la tarea | `requirement_tasks.blockers ?? requirement_tasks.notes`. | |
| Botón "Registrar horas" (solo Admin) | `RegistrarHorasDialog` → Server Action `registrarHoras()`, inserta en `activity_logs` con `task_id`. | Acumulable con el tiempo; solo se ve el total, sin desglose de cada registro. |
| Edición inline (lápiz), eliminar tarea (solo Admin) | `src/components/tarea-acciones-admin/` → `actualizarTarea()`/`actualizarEstadoTarea()`/`eliminarTarea()`. | Eliminar una tarea borra en cascada sus `activity_logs` asociados (`on delete cascade`). |

## Actividades sin fase (histórico, colapsable)

| Elemento visual | Origen | Notas |
| --- | --- | --- |
| Bloque "Actividades sin fase asignada" (`ActividadesSinFase`, colapsado por defecto) | `activity_logs` con `task_id is null` — registradas antes de la fusión tarea/actividad del 2026-08-11. | Fecha, tipo (`event_type` vía `TIPO_ACTIVIDAD_LABEL`), autor (`nombre_autor()` RPC), horas, notas. Decisión del PO: se mantiene visible tal cual, no se migra ni se oculta. |

## Enlaces de acción

| Elemento visual | Origen | Notas |
| --- | --- | --- |
| "Link del desarrollo" (o "Sin enlace configurado") | `requirements.dev_environment_url` (nullable, validado como URL en el formulario de edición). | Único enlace de esta sección — no hay botones separados de Datos de prueba/Jira/GitHub. |

## Columnas de `requirements`/`requirement_tasks` sin representación en esta pantalla

- `requirements.has_detail_tracking`: solo controla el atenuado/badge de la card en el Home, no se muestra aquí.
- `requirement_tasks.milestone`, `sort_order`: uso interno (orden/hito), sin UI propia todavía.
