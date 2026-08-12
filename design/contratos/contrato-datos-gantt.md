# Contrato de datos — Gantt

> El mockup `design/fase-c1-gantt-planeacion.dc.html` que originó este contrato ya se retiró del repo (era un artefacto de diseño one-off, no la fuente de verdad). El contrato sigue vigente como documento — la fuente de verdad real es el código listado abajo.

**Actualizado 2026-08-10 tras ejecutar la Unidad C1 completa** (semillado de
fechas, edición, refinamiento visual, semáforo vencido, extensión de horas
por tarea). La versión anterior de este documento quedó desactualizada por
la rama `fase-c` (Home/Gantt-visual/Detalle, mergeada antes de C1): ya
describía `milestone`/`planned_dates_confirmed` como faltantes cuando en
realidad ya existían en producción desde esa rama.

**Pivot de diseño durante la verificación en vivo con el PO (mismo día):**
el primer corte de C1.3 comprimía todo el rango de fechas del requerimiento
en el ancho disponible — con requerimientos de varios meses esto amontonaba
las tareas y dejaba espacio vacío. El PO pidió en su lugar una **ventana
navegable tipo calendario** (mes calendario completo / 7 días / 14 días,
con botones "< Hoy >"), y también amplió el alcance de la pantalla de
edición para poder **crear y eliminar tareas** (no solo editar fechas) —
ver la sección "Navegación" abajo. El documento refleja el diseño final,
no el plan original (historial de ejecución en git).

Fuente de verdad del esquema: `src/lib/supabase/database.types.ts` +
`supabase/migrations/`. Fuente de verdad de la lógica actual:
`src/lib/planeacion-data.ts`, `src/lib/semaforo.ts`,
`src/components/planeacion/gantt-timeline.tsx`.

Regla de rol: la vista es de solo lectura para todos; el botón "Editar
fechas" (nuevo, C1.2) solo aparece para Admin.

## Filtros y toggles

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Zoom Día/Semana/Mes | Estado local (`escala` en `planeacion-client.tsx`). Cada escala es una **ventana navegable**, no todo el rango comprimido: Día = 14 días, Semana = 7 días, Mes = mes calendario completo (`calcularRangoVisible()` en `gantt-timeline.tsx`). `PX_POR_DIA` generoso (60/120/28) para que las tareas nunca se vean amontonadas. | **Implementado (C1.3, rediseñado tras feedback del PO).** |
| Navegación "< Hoy >" | Botones en `planeacion-client.tsx` (`avanzarPeriodo()`), mueven la fecha de referencia un período completo hacia atrás/adelante; "Hoy" la resetea a `hoyLocal()`. Etiqueta del período visible (`etiquetaPeriodo()`) junto a los botones. | **Implementado (C1.3).** |
| Filtro Todos/Con consumo/Sin consumo | `PlaneacionRequerimiento.tieneConsumo` (`planeacion-data.ts`) — true si alguna tarea tiene `requirement_tasks.executed_hours > 0`. | **Implementado, a nivel de tarea** (extensión de C1, fuera del diseño original de C3 — ver `supabase/migrations/20260810120000_c1_ext_horas_por_tarea.sql`). Requiere que el registro de actividad se haga con el selector de tarea del modal. |
| Ventana inicial al seleccionar un requerimiento | `referenciaInicial()` en `planeacion-client.tsx`: hoy si cae dentro del rango real de sus tareas, si no la fecha de su primera tarea. | Implementado. |

## Barras de tarea

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Color de barra (verde/amarillo/rojo/**vencido**/gris) | `calcularSemaforo(end, hoyLocal(), completada)` en `src/lib/semaforo.ts`, sobre `planned_end_date` (o `due_date` como fallback). | **Implementado (C1.4)** — 5º valor `"vencido"` agregado, distinto de "rojo" (próximo a vencer). Una tarea `status === "Completada"` nunca se pinta vencida. |
| Fechas de la barra (`start`/`end`) | `requirement_tasks.planned_start_date`/`planned_end_date`. | **Sembradas (C1.1)** — ya no dependen del fallback a `due_date` para la mayoría de las tareas; el fallback se mantiene solo por robustez si alguna fecha quedara NULL. |
| Patrón rayado = "fecha estimada, no confirmada" | `requirement_tasks.planned_dates_confirmed`. | Implementado (ya existía desde la rama `fase-c`, reutilizado sin cambios). Se vuelve `true` al editar desde la pantalla de C1.2. |
| Tooltip (tarea, estado, fechas, duración, horas, asignado) | `task_name`, `status`, `start`/`end` (vía `diffDias`), `estimated_hours`, `assignee`. | **Implementado (C1.3)** — `assignee` agregado al `select()` de `planeacion-data.ts` (ya existía en BD, no se traía). |

## Hitos

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Rombo de hito | `requirement_tasks.milestone`. | Implementado (ya existía desde la rama `fase-c`). |

## Estructura de columnas

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Columna fija de nombres, fuera del scroll horizontal | Layout: la columna de nombres es un `flex` sibling **fuera** del contenedor `overflow-x-auto` (no `position: sticky`) — más simple y sin los edge cases de sticky. | **Implementado (C1.3).** |
| Grid día/semana/mes con cabecera de dos filas (mes + día/semana) | Columnas absolutas calculadas en `gantt-timeline.tsx`. | **Implementado (C1.3).** |
| Fases colapsables (barra resumen por fase) | `resumenFase()` en `gantt-timeline.tsx` — `min(start)`/`max(end)` de las tareas de la fase. Colapsadas por defecto salvo la fase en curso (mismo criterio que `calcularFaseActual`). | **Implementado (C1.3).** |

## Navegación

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Botón "Detalle" | `/requerimiento/[slug]` — mismo componente `TareasPorFase`, mismas Server Actions `crearTarea`/`eliminarTarea`/`guardarFechasPlaneadas` (`src/app/actions/tasks.ts`). | **Implementado.** Hasta el 2026-08-12 (PR #25) este botón se llamaba "Editar fechas" y llevaba a la pantalla aparte `/planeacion/[requerimiento]/editar` — se eliminó esa ruta al confirmarse que era un subconjunto casi vacío del mismo componente; ahora navega directo al Detalle completo, sin scroll automático. Visible para Admin y Viewer por igual (antes solo para Admin). |
| "+ Añadir tarea" (nombre, fase, fecha límite, fechas planeadas) | Formulario en el encabezado de cada fase, dentro de `TareasPorFase`, en la pantalla de Detalle (`crearTarea`). | **Implementado.** No incluye `estimated_hours`/`assignee`/`status` al crear — eso sigue siendo CRUD completo (Unidad C2). |
| Eliminar tarea (con confirmación) | Botón por fila (`eliminarTarea`) — `activity_logs.task_id` es `on delete set null`, no se pierde la bitácora de esa tarea. | **Implementado.** |
| Registro de actividades | Vive solo en la pantalla de Detalle del requerimiento (justo tras el encabezado) — ya no existe una pantalla "Editar fechas" separada donde pudiera duplicarse. | Reubicado 2026-08-10; ruta separada eliminada 2026-08-12. |
| Clic en barra → detalle del requerimiento | `requirements.slug`. | Sin cambios respecto a la versión anterior de este documento. |
