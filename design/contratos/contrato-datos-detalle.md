# Contrato de datos — Detalle de requerimiento (`design/fase-c-detalle-requerimiento.dc.html`)

Fuente de verdad del esquema: `src/lib/supabase/database.types.ts` + `supabase/migrations/`. Fuente de verdad de la lógica actual: `src/lib/requerimiento-data.ts`, `src/lib/fases.ts`, `src/components/fase-stepper.tsx`.

Regla de rol: el Viewer ve toda la pantalla (info general, horas, tareas por fase, registro de actividades) en modo solo lectura. El único control que se oculta al Viewer es el botón **"+ Añadir actividad"** — el resto de la pantalla es idéntica para ambos roles.

## Cabecera e información general

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| ID, nombre, descripción, cliente, asignados, fechas | `requirements.code/title/...`. Nota: no hay columna `description` corta ni `client`/`assignees` en el esquema real (`code`, `title`, `category`, `complexity`, `month_label`, `status`, `deadline`, `estimated_hours`, `executed_hours`, `billing_date`, `notes`, `documentation_folder_url`, `dev_environment_url`). | **Parcial.** "Descripción corta", "Cliente/Stakeholder" y "Asignado(s)" tal como se ven en el mockup **no existen** como columnas hoy — son datos de ejemplo. Requiere decidir con el PO si se agregan columnas nuevas a `requirements` o si se recorta el mockup a lo que sí existe. |

## KPIs de horas

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Horas estimadas / consumidas / restantes | `requirements.estimated_hours`, `requirements.executed_hours`, resta calculada. | Existe y se consume hoy. |
| Horas por fase (estimadas vs. consumidas) | `requirement_tasks.phase_number/phase_name/estimated_hours`, agrupado y sumado en `agruparPorFase()` (`src/lib/fases.ts`). | Existe y se consume hoy. Las 5 fases reales son: `Requerimientos`, `Diseño`, `Desarrollo`, `QA`, `Producción` (`src/lib/fases-orden.ts`, reforzado con `check constraint` en la BD — no se pueden usar otros nombres sin migrar el constraint). |

## Tareas por fase (acordeón)

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Agrupación por las 5 fases reales, cada una expandible/colapsable | `requirement_tasks.phase_number/phase_name`. | **Cambio respecto al código real de hoy**: `fase-stepper.tsx` actualmente solo muestra las tareas activas de la fase `en-curso` — el resto de las 185 tareas reales del proyecto nunca se renderiza (limitación documentada en `ROADMAP_V2.md`). Este rediseño corrige eso: cada fase expone TODAS sus tareas al expandirse. Comportamiento sugerido: fases `en-curso`/`pendiente` abiertas por defecto, `completada` colapsadas (el usuario puede alternar cualquiera). |
| Nombre de tarea | `requirement_tasks.task_name`. | Existe y se consume hoy. |
| Descripción/detalle de tarea (`t.detalle`) | `requirement_tasks.detail`. | Existe y se consume hoy — **importante**: esta es la columna `detail`, NO `notes`. Son dos columnas distintas en el esquema real. |
| Advertencia ⚠ bajo la tarea | `requirement_tasks.blockers ?? requirement_tasks.notes` (mismo fallback que usa `fase-stepper.tsx` hoy, línea `bloqueo = t.bloqueantes ?? t.notas`). | Existe y se consume hoy — se mantiene separado del campo `detail`, sin fusionarlos. |
| Estado, asignado, fecha límite, horas por tarea | `requirement_tasks.status`, `due_date`, `estimated_hours`. Nota: no hay columna `assignee` en `requirement_tasks` — el "asignado" por tarea es dato de ejemplo hoy. | Parcial — falta columna `assignee` si se quiere ese dato real por tarea (hoy el asignado solo existe a nivel de requerimiento, como dato de ejemplo también). |

## Registro de actividades

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Tabla de actividades (fecha, tipo, autor, horas, comentario) | Tabla `activity_logs`: `id`, `requirement_id`, `event_type` (check: `SEGUIMIENTO`/`PRESENTACION_FLUJO`/`GESTION_DOCUMENTAL`/`REFINAMIENTO_TECNICO`/`OTRO`), `title`, `notes`, `hours_spent`, `logged_at`. | **La tabla existe pero está vacía y sin ningún consumidor en el código** — ningún `src/lib/*-data.ts` la consulta todavía. Además, **RLS está habilitado pero sin ninguna policy**: hoy nadie puede leerla ni escribirla vía API, ni siquiera autenticado. Falta Unidad C3.1 (policies) antes de que esta sección funcione con datos reales. |
| Botón "+ Añadir actividad" (modal, solo Admin) | Formulario mapeado 1:1 a columnas de `activity_logs`: Tipo → `event_type`, Título → `title`, Comentario/notas → `notes`, Horas → `hours_spent`, Fecha → `logged_at`. | **Diseño nuevo, sin implementación.** No existe columna de autor (`created_by`) en `activity_logs` — si se necesita registrar quién creó la actividad, hay que agregar esa columna (gap adicional, no resuelto por este rediseño). Requiere también las policies de RLS mencionadas arriba antes de poder escribir. |

## Enlaces de acción

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Botón único "Link del desarrollo" (unifica los 3 botones anteriores: Datos de prueba/Jira/GitHub) | `requirements.dev_environment_url` (columna `text`, nullable). | **Existe en BD pero sin consumidor en el código** — ninguna query la trae hoy. Se reutiliza esta columna en vez de crear una nueva. La columna `requirements.documentation_folder_url` (también existente y sin uso) queda sin destino tras esta unificación — a validar con el PO si se descarta o se reutiliza para otra cosa en el futuro. |
