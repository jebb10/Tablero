# Contrato de datos — Gantt (`design/fase-c1-gantt-planeacion.dc.html`)

Fuente de verdad del esquema: `src/lib/supabase/database.types.ts` + `supabase/migrations/`. Fuente de verdad de la lógica actual: `src/lib/planeacion-data.ts`, `src/lib/semaforo.ts`, `src/components/planeacion/gantt-timeline.tsx`.

Regla de rol: pantalla de solo lectura. El diseño se enfoca en el flujo Admin; no se maquetó una variante Viewer aparte (misma vista para ambos, sin controles de escritura en ninguna).

## Filtros y toggles

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Zoom Mensual/Semanal | Estado local del componente. | Existe y se consume hoy (mismo patrón). |
| Filtro Todos/Con consumo/Sin consumo | `requirements.has_detail_tracking` (proxy de "con consumo" hoy: solo los que tienen `has_detail_tracking = true` entran al Gantt en absoluto — ver más abajo). | Existe parcialmente: hoy el Gantt SOLO trae requerimientos con `has_detail_tracking = true`; no hay un concepto separado de "con/sin consumo de horas" en esta vista. Habría que decidir si "sin consumo" debe referirse a `executed_hours = 0` (dato disponible) en vez de a `has_detail_tracking`. |
| Carga inicial = mes actual | — | Ajustado en el mockup: el zoom por defecto es "mes" y el rango (`MES_INICIO`/`MES_FIN`) cubre el mes en curso, con la columna de "hoy" resaltada. |

## Barras de tarea

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Color de barra (verde/amarillo/rojo/gris) | `calcularSemaforo(deadline)` en `src/lib/semaforo.ts`, aplicado sobre `planned_end_date` (o `due_date` como fallback). | Existe y se consume hoy — el mockup ahora usa exactamente esta semántica (antes usaba un estado de tarea ficticio: pendiente/proceso/completada/atrasada, que no existe como tal en el código real). |
| Fechas de la barra (`start`/`end`) | `requirement_tasks.planned_start_date` / `planned_end_date`, con fallback a `due_date` si son `NULL`. | Existe y se consume hoy, con la limitación conocida: en producción `planned_start_date`/`planned_end_date` están `NULL` para todas las tareas (no migradas desde el Excel), así que hoy toda tarea se dibuja como un marcador de un solo día. |
| Patrón rayado = "fecha estimada, no confirmada" | — | **No existe.** Requiere una columna nueva `planned_dates_confirmed` (boolean) en `requirement_tasks` — no está en ninguna migración ni en `database.types.ts` hoy. El mockup ya diseña visualmente la distinción (barra sólida vs. rayada) para cuando esa columna exista. |
| Tooltip (tarea, fechas, asignado, avance) | `task_name`, fechas, `status`. | "Asignado" y "% de avance" **no existen** como columnas en `requirement_tasks` (no hay `assignee`/`progress_pct`) — hoy son datos de ejemplo en el mockup. Habría que definir con el PO si se agregan columnas nuevas o si el tooltip se recorta a lo que sí existe (tarea + fechas + estado). |

## Hitos

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Rombo de hito | `requirement_tasks.milestone` (columna `text`, nullable). | **Existe en BD pero la query actual de `planeacion-data.ts` no la trae** (su `select()` no incluye `milestone`). Requiere agregar `milestone` al `select()` de tareas. |

## Estructura de columnas

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Columna fija de nombres (260px, fuera del scroll horizontal) | Layout CSS puro. | Ya funciona así en el mockup por estructura (dos columnas flex, la de nombres fuera del `overflow-x:auto`) — replicar este mismo patrón de layout en `gantt-timeline.tsx` resolvería el gap de "columna sticky" que señala el roadmap. |

## Navegación

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Clic en barra → detalle del requerimiento | `requirements.slug`. | Existe y se consume hoy (mismo patrón de link que en Home). |
