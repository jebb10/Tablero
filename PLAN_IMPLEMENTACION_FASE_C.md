# Plan de implementación — Fase C (Home, Gantt, Detalle) con datos reales

> Este documento es autocontenido para ejecutarse en una sesión nueva. No depende de que quien lo ejecute haya visto la conversación donde se diseñó. Antes de tocar código, lee `CLAUDE.md` (estado del proyecto) y los 3 mockups + contratos en `design/` y `design/contratos/`.

## Contexto

Los 3 mockups de Fase C (`design/home-resumen-general.dc.html`, `design/fase-c1-gantt-planeacion.dc.html`, `design/fase-c-detalle-requerimiento.dc.html`) ya fueron ajustados al esquema real del proyecto y documentados campo a campo en `design/contratos/contrato-datos-{home,gantt,detalle}.md`. Este plan lleva esos 3 diseños a código: Home (KPIs nuevos + fase actual), Gantt (semáforo real, hitos, estimado/confirmado) y Detalle (campos nuevos, acordeón de tareas por fase, registro de actividades funcional). Regla de negocio transversal: **toda funcionalidad de escritura es exclusiva de Admin; el Viewer solo lee** — ya implementado como patrón (`requireAdmin()`, `RoleGate`, RLS con `is_admin()`); este plan reutiliza ese mismo patrón, no inventa uno nuevo.

Decisiones de negocio ya cerradas con el PO (no hace falta volver a preguntarlas):

- **Reabiertos**: se cuenta como reabierto cuando un requerimiento pasa de `ENTREGADO_PRODUCCION` (o `CERRADO_POR_CAMBIO_ALCANCE`) de vuelta a `EN_CURSO`. Se implementa con un contador `reopened_count` incrementado por trigger de BD (no manual).
- **Salud del proyecto**: semáforo por tareas vencidas + requerimientos bloqueados (RN-03), con los mismos umbrales que ya trae el mockup: verde = 0 vencidas y 0 bloqueados; amarillo = 1-3 vencidas o 1 bloqueado; rojo = 4+ vencidas o 2+ bloqueados.
- **Campos faltantes de cabecera** (descripción corta, cliente/stakeholder, asignados en `requirements`; asignado en `requirement_tasks`): se agregan como columnas nuevas ahora, no se recorta el alcance visual.
- **Autor de actividad**: se agrega `activity_logs.created_by` (FK a `auth.users`), llenado automáticamente con el usuario autenticado al guardar.
- **`documentation_folder_url`**: se elimina de `requirements` en la misma migración (columna huérfana tras unificar los enlaces en "Link del desarrollo" = `dev_environment_url`).

## 0. Migración de esquema (una sola migración SQL)

Archivo nuevo: `supabase/migrations/<timestamp>_fase_c_campos_y_activity_logs.sql`. Aplicar con `npm run db:push` (CLI de Supabase), luego regenerar tipos con `npm run types:db` — **hacer esto antes de tocar cualquier archivo TypeScript**, para poder tipar todo lo demás sin `as`.

```sql
-- 1. Campos nuevos en requirements
alter table requirements
  add column description text,
  add column client_stakeholder text,
  add column assignees text[],
  add column reopened_count integer not null default 0;

alter table requirements drop column documentation_folder_url;

-- 2. Campos nuevos en requirement_tasks
alter table requirement_tasks
  add column assignee text,
  add column planned_dates_confirmed boolean not null default false;

-- 3. Trigger de reabiertos: EN_CURSO viniendo de ENTREGADO_PRODUCCION o CERRADO_POR_CAMBIO_ALCANCE
create or replace function trg_incrementar_reopened_count()
returns trigger as $$
begin
  if new.status = 'EN_CURSO'
     and old.status in ('ENTREGADO_PRODUCCION', 'CERRADO_POR_CAMBIO_ALCANCE') then
    new.reopened_count := old.reopened_count + 1;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger requirements_reopened_count
  before update on requirements
  for each row
  execute function trg_incrementar_reopened_count();

-- 4. activity_logs: columna de autor + RLS (append-only, mismo patrón que requirements/requirement_tasks)
alter table activity_logs
  add column created_by uuid references auth.users(id);

create policy activity_logs_select_authenticated
  on activity_logs for select
  to authenticated
  using (true);

create policy activity_logs_insert_admin
  on activity_logs for insert
  to authenticated
  with check (public.is_admin());

-- Deliberadamente SIN policy de update/delete: el registro de actividades es
-- append-only, igual que el patrón ya usado para "Cerrado por cambio de
-- alcance" (ver ROADMAP_V2.md) — ni siquiera Admin edita/borra una entrada ya guardada.
```

Después de aplicar: `npm run types:db` para regenerar `src/lib/supabase/database.types.ts`.

## 1. Unidad C0 — Home (`src/lib/dashboard-data.ts`, `src/lib/kpis.ts`, `src/components/dashboard-client.tsx`, `src/components/kpi-strip.tsx`)

- Agregar `reopened_count` al `select()` de `requirements` en `dashboard-data.ts`; mapear a `Requerimiento.reabierto` (número) en `src/lib/types.ts`.
- Nueva query en `dashboard-data.ts`: traer `requirement_tasks(requirement_id, phase_number, phase_name, status, due_date, planned_end_date, milestone)` para todos los requerimientos con `has_detail_tracking = true` del proyecto (una sola query, no N+1).
- Con esos datos, calcular por requerimiento la **fase actual** (reutilizar/generalizar `estadoDeFase()` de `src/lib/fases.ts`: la primera fase, en orden de `FASES_ORDEN`, cuyas tareas no estén todas en estado `Completada`). Exponer como `Requerimiento.faseActual: string | null` (null para los 21 heurísticos, sin `requirement_tasks`).
- Con la misma query, armar `hitosProximos`: filtrar tareas con `milestone` no nulo, ordenar por `planned_end_date ?? due_date` ascendente, tomar las próximas 3-5.
- `src/lib/kpis.ts` — `getKPIs()`:
  - `reabiertos`: contar requerimientos con `reopened_count > 0`.
  - `vencidas`: contar tareas (de la nueva query) con `(planned_end_date ?? due_date) < hoy` y `status !== 'Completada'`.
  - `entregasIncumplidas`: contar requerimientos con `deadline < hoy` y `estado` no en `["Entregado en producción", "Cerrado por cambio de alcance"]`.
  - `bloqueados`: ya existe (`contieneBloqueo()` en `dashboard-data.ts`) — reutilizar, no reimplementar.
  - `salud`: aplicar los umbrales ya acordados (ver Contexto) sobre `vencidas`+`entregasIncumplidas`+`bloqueados`.
- `dashboard-client.tsx`: agregar el badge de fase actual a cada card dentro de los 4 bloques (igual que en el mockup ya editado), usando `faseActual` (o "Sin fase registrada" si es `null`).
- `kpi-strip.tsx` o el nuevo bloque de KPIs de `dashboard-client.tsx`: agregar las tarjetas "Reabiertos" y "Salud del proyecto" (semáforo) siguiendo el layout ya definido en `design/home-resumen-general.dc.html`.
- Sección "Hitos próximos": nuevo componente o extensión de `dashboard-client.tsx`, mismo layout del mockup.
- Los 21 heurísticos siguen sin ser navegables en código real (`requerimiento-card.tsx` no cambia en esta unidad) — el badge de fase para ellos debe mostrar "Sin fase registrada" sin romper el layout.

## 2. Unidad C1 — Gantt (`src/lib/planeacion-data.ts`, `src/components/planeacion/gantt-timeline.tsx`)

- `planeacion-data.ts`: agregar `milestone` y `planned_dates_confirmed` al `select()` de `requirement_tasks` (hoy no se traen).
- `gantt-timeline.tsx`: el color de barra ya usa `calcularSemaforo()` (`src/lib/semaforo.ts`) — **no hay que reinventar nada aquí**, solo confirmar que sigue siendo la fuente de color (el mockup ya se alineó a esto).
- Renderizar el rombo de hito cuando `milestone` no sea nulo (mismo patrón visual que ya existe en el mockup: rombo naranja con tooltip).
- Aplicar el patrón visual "fecha estimada" (rayado) cuando `planned_dates_confirmed === false`, barra sólida cuando `=== true`.
- Carga inicial: confirmar que el viewport muestre el mes actual por defecto y resalte la columna de "hoy" (ya es el comportamiento base, solo verificar que sigue así tras los cambios).
- Nota conocida y fuera de alcance de esta unidad: `planned_start_date`/`planned_end_date` siguen `NULL` en producción — esto no se resuelve aquí, solo se prepara la UI para cuando existan datos reales (unidad de seguimiento ya documentada en `CLAUDE.md`, "Prioridad inmediata de seguimiento").

## 3. Unidad C2 — Detalle del requerimiento (`src/lib/requerimiento-data.ts`, `src/lib/types.ts`, nuevo componente de acordeón)

- `requerimiento-data.ts`: agregar `description`, `client_stakeholder`, `assignees` al `select()` de `requirements`; agregar `assignee` al `select()` de `requirement_tasks`.
- Actualizar `src/lib/types.ts` (`Requerimiento`, `Tarea`) con los campos nuevos.
- Reemplazar el uso de `FaseStepper` (`src/components/fase-stepper.tsx`) en `src/app/requerimiento/[item]/page.tsx` por un nuevo componente cliente, p. ej. `src/components/tareas-por-fase.tsx`: acordeón de las 5 fases reales (`FASES_ORDEN`), cada una expandible/colapsable, mostrando TODAS las tareas de la fase (no solo las de la fase `en-curso` como hace hoy `fase-stepper.tsx` — esto corrige la limitación conocida documentada en `ROADMAP_V2.md`). Por defecto: fases `en-curso`/`pendiente` abiertas, `completada` colapsadas.
- Cada fila de tarea muestra: `task_name`, `detail` (campo `detalle`, **no** `notes`), `status`, `assignee`, `due_date`, `estimated_hours`, y si existe `blockers ?? notes`, el aviso ⚠ debajo (mismo fallback que ya usa `fase-stepper.tsx` hoy — no cambia esa lógica, solo se muestra para todas las tareas en vez de solo las activas).
- Decidir si `fase-stepper.tsx` se borra (si no queda ningún consumidor tras este cambio) o se deja archivado — confirmar con `grep` antes de borrar.
- Botón único "Link del desarrollo" apuntando a `requirements.dev_environment_url` (si es `null`, deshabilitar o mostrar "Sin enlace configurado" en vez de un link roto).
- Cabecera: mostrar `description`, `client_stakeholder`, `assignees.join(", ")`.

## 4. Unidad C3 — Registro de actividades (`activity_logs`)

- Nuevo módulo de datos, p. ej. `src/lib/actividades-data.ts`: `getActividades(requirementId)` — consulta `activity_logs` por `requirement_id`, ordenado por `logged_at` descendente. Traer `event_type`, `title`, `notes`, `hours_spent`, `logged_at`, y el nombre del autor (join con `profiles` por `created_by`, o mostrar el `full_name` si `profiles` lo tiene disponible vía una policy de lectura ya existente).
- Server Action `agregarActividad(requirementId, formData)` en `src/app/requerimiento/[item]/actions.ts` (nuevo archivo o extender el existente `src/app/actions.ts` si aplica): empieza con `requireAdmin()` (`src/lib/auth/session.ts`, ya existe, sin consumidores todavía — este es su primer uso real), inserta en `activity_logs` con `created_by = session.user.id`, y llama a `refresh()` de `next/cache` al terminar (mismo patrón que `reintentar()`).
- Modal "Añadir actividad" en el cliente: formulario controlado (Tipo/Título/Notas/Horas/Fecha, igual que el mockup) que llama a la Server Action vía `useActionState` (mismo patrón que `login-form.tsx`/`recuperar-form.tsx`).
- El botón "+ Añadir actividad" se envuelve en `<RoleGate role="admin">` (`src/components/auth/role-gate.tsx`) — el Viewer nunca recibe el botón en el payload RSC, ni siquiera oculto por CSS.
- La RLS de `activity_logs` (ya creada en la migración de la sección 0) es el control real: aunque alguien intente llamar la Server Action manipulando el cliente, el `insert` falla para un Viewer porque `public.is_admin()` es `false`.

## 5. Verificación end-to-end

1. `npm run types:db` sin errores tras la migración; `npm run build` sin errores de tipos.
2. Como Admin en producción/staging: cambiar el estado de un requerimiento de `Entregado en producción` a `En curso` y confirmar que `reopened_count` sube y el KPI "Reabiertos" de Home lo refleja.
3. Confirmar que el semáforo de "Salud del proyecto" cambia de color al crear una tarea de prueba con `due_date` vencida.
4. En `/planeacion`: confirmar que una tarea con `milestone` no nulo muestra el rombo, y que `planned_dates_confirmed = false` se ve con el patrón rayado.
5. En el detalle de un requerimiento con `has_detail_tracking = true`: confirmar que el acordeón muestra TODAS las tareas de cada fase (no solo las de la fase en curso), y que el campo `detail` y el aviso `blockers ?? notes` se muestran por separado, sin fusionarse.
6. Como Admin: usar el modal "Añadir actividad", confirmar que la fila aparece en la tabla con el autor correcto.
7. Como Viewer: confirmar que el botón "+ Añadir actividad" no aparece en el HTML/RSC payload (inspeccionar, no solo visualmente), y que un intento directo de `insert` a `activity_logs` vía API falla por RLS (extender `scripts/verificar_seguridad_fase_b.mjs` con este caso, siguiendo el mismo patrón de las 11 pruebas de B.6).
8. Confirmar que no queda ninguna referencia en código a `documentation_folder_url` tras el `DROP COLUMN` (`grep -r documentation_folder_url src/`).

## Riesgos / notas para quien ejecute

- La migración de la sección 0 toca 3 tablas y agrega un trigger — probarla primero contra un proyecto Supabase de staging si existe, o al menos revisar el DDL con cuidado antes de `db:push` a producción (no hay ambiente de staging documentado en `CLAUDE.md` hoy).
- `assignees` se definió como `text[]` (array de Postgres) para permitir varios nombres — si se prefiere texto libre simple, cambiar a `text` antes de correr la migración, es más simple de editar en un formulario pero pierde estructura.
- Este plan no incluye un formulario de edición para los campos nuevos de cabecera (`description`, `client_stakeholder`, `assignees`) — hoy no hay pantalla de creación/edición de requerimientos (esa es la Unidad C2 "CRUD" completa del roadmap, más amplia que este plan). Mientras tanto, esos campos se llenan directamente en Supabase (SQL Editor) para los 7 requerimientos con `has_detail_tracking = true`.
