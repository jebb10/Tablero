# Contrato de datos — Home

> El mockup `design/home-resumen-general.dc.html` que originó este contrato ya se retiró del repo (era un artefacto de diseño one-off, no la fuente de verdad). El contrato sigue vigente como documento — la fuente de verdad real es el código listado abajo.

Fuente de verdad del esquema: `src/lib/supabase/database.types.ts` + `supabase/migrations/`. Fuente de verdad de la lógica actual: `src/lib/dashboard-data.ts`, `src/lib/kpis.ts`, `src/components/dashboard-client.tsx`, `src/components/kpi-strip.tsx`.

Regla de rol: toda esta pantalla es de solo lectura. No hay ningún control de escritura — Admin y Viewer ven exactamente lo mismo.

## KPIs superiores

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| "Requerimientos" (total, con/sin consumo) | `requirements` (todas las filas del proyecto) + `requirement_tasks.requirement_id` para `sinTareas`. Lógica: `getKPIs()` en `src/lib/kpis.ts`. | Existe y se consume hoy. |
| "Reabiertos" | — | **No existe.** No hay columna `reopened`/`reabierto` en `requirements` ni lógica de conteo. Requiere definir con el PO qué significa "reabierto" (¿cambio de estado de vuelta a `EN_CURSO` después de `ENTREGADO_PRODUCCION`? ¿un historial de estados?) antes de poder implementarlo. Diseñado como placeholder visual (futura Unidad C0). |
| "Salud del proyecto" (semáforo) | — | **No existe.** El mockup calcula localmente (`vencidas + entregasIncumplidas`, `bloqueados`) solo con datos de ejemplo. En producción falta: fuente real de "entregas incumplidas" y umbral acordado con el PO. Placeholder visual (futura Unidad C0). |
| "Horas: consumidas / estimadas" + barra de desviación | `requirements.estimated_hours`, `requirements.executed_hours`, sumados en `getKPIs()`. | Existe y se consume hoy. |

## Bloques de estado + avance por requerimiento (sección fusionada)

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Agrupación en 4 bloques (En curso/Pausados/No iniciados/Entregados) | `requirements.status` → `dbAEstado()` (`src/lib/estados.ts`). Constante `BLOQUES` en `dashboard-client.tsx`. | Existe y se consume hoy. El 5º estado (`Cerrado por cambio de alcance`) va aparte, colapsado — no se toca en este rediseño. |
| Barra de avance (%) y horas por tarjeta | `executed_hours / estimated_hours` por requerimiento. | Existe y se consume hoy. |
| Badge de fase actual junto a la tarjeta | `requirement_tasks.phase_name` del requerimiento, agrupado vía `agruparPorFase()` (`src/lib/fases.ts`) — se necesitaría exponer la fase "actual" (última fase no completada) por requerimiento en la query de Home, cosa que hoy `dashboard-data.ts` no trae (solo trae columnas de `requirements`, no de `requirement_tasks` agrupadas por fase). | **Requiere query nueva**: unir `requirements` con su fase actual calculada desde `requirement_tasks`. Solo aplica a los 7 requerimientos con `has_detail_tracking = true`; para el resto se muestra "Sin fase registrada" (no hay `requirement_tasks` asociadas). |
| Tarjetas clicables (incluye los 21 heurísticos) | `requirements.has_detail_tracking` → hoy determina si `requerimiento-card.tsx` envuelve en `<Link>`. | El mockup asume que TODOS son navegables — contradice el código real hoy (`esNavegable = req.tieneDetalle`). Decisión explícita del PO: dejarlo así hasta un punto de refinamiento futuro (Unidad C2.4 pendiente). |

## Próximas fechas límite

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Lista de próximas fechas límite | `requirements.deadline`, ordenado por proximidad. | Existe y se consume hoy (concepto ya usado en el semáforo de `requerimiento-card.tsx`, `src/lib/semaforo.ts`). |

## Hitos próximos

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Lista de hitos próximos | `requirement_tasks.milestone` (columna `text`, nullable). | **Existe en BD pero no se consulta desde Home** — `dashboard-data.ts` no hace ningún `select` a `requirement_tasks.milestone`. Requiere nueva query que traiga `milestone`+`due_date`/`planned_end_date` de todas las tareas del proyecto, no solo de un requerimiento. |

## Filtros

| Elemento visual | Origen | Estado |
| --- | --- | --- |
| Búsqueda por nombre/ID | Campo local (`useState`) sobre `nombre`+`item` ya cargados. | Existe y se consume hoy. |
| Filtro de complejidad | `requirements.complexity`. | Existe y se consume hoy. |
| Filtro de mes | `requirements.month_label`. | Existe y se consume hoy. |
