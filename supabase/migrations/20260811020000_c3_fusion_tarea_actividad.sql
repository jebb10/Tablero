-- Segundo pivot en vivo de la Unidad C3 (2026-08-11): el PO redefine "tarea" y
-- "actividad" como el mismo concepto -- un solo botón "Añadir tarea" por fase,
-- con horas consumidas acumulables (se reutiliza el mecanismo de C1:
-- activity_logs.task_id + trigger -> requirement_tasks.executed_hours). Se
-- agrega también una fecha límite POR FASE (independiente de las tareas),
-- para que cada fase tenga su propio hito en el Gantt.

-- 1. Fecha límite de fase: no existe hoy ningún lugar donde guardar "una
-- fecha por fase de un requerimiento" (las fases son un agrupamiento virtual
-- por phase_number, no una fila en BD).
create table requirement_phase_deadlines (
  requirement_id uuid not null references requirements(id) on delete cascade,
  phase_number int not null check (phase_number between 1 and 5),
  due_date date not null,
  updated_at timestamptz not null default now(),
  primary key (requirement_id, phase_number)
);

alter table requirement_phase_deadlines enable row level security;

create policy "read_authenticated" on public.requirement_phase_deadlines
  for select to authenticated using (true);
create policy "admin_insert" on public.requirement_phase_deadlines
  for insert to authenticated with check (public.is_admin());
create policy "admin_update" on public.requirement_phase_deadlines
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_delete" on public.requirement_phase_deadlines
  for delete to authenticated using (public.is_admin());

comment on table requirement_phase_deadlines is
  'Fecha límite configurable por fase de un requerimiento (independiente de las fechas de sus tareas) -- se dibuja como hito propio de la fase en el Gantt.';

-- 2. Migrar las actividades registradas hoy en modo "fase sin tarea" (con el
-- primer rediseño de esta misma unidad) a tareas reales -- el PO ya no
-- distingue tarea de actividad. Alcance intencionalmente acotado: solo filas
-- con phase_number asignado y sin task_id todavía. Las actividades más
-- viejas (sin phase_number, incluido "Saldo inicial migrado" de C3.3) NO se
-- tocan -- siguen viéndose en el bloque histórico ActividadesSinFase.
do $$
declare
  fila record;
  tarea_id uuid;
  siguiente_orden int;
  nombre_fase text;
begin
  for fila in
    select id, requirement_id, phase_number, title, logged_at, hours_spent
    from activity_logs
    where phase_number is not null and task_id is null
  loop
    -- requirement_tasks_natural_key es único por (requirement_id,
    -- phase_number, task_name) -- si ya existe una tarea con ese nombre en
    -- esa fase, es razonable asumir que es la misma pieza de trabajo:
    -- vincular la actividad a esa tarea en vez de duplicarla.
    select id into tarea_id
    from requirement_tasks
    where requirement_id = fila.requirement_id
      and phase_number = fila.phase_number
      and task_name = fila.title;

    if tarea_id is null then
      nombre_fase := case fila.phase_number
        when 1 then 'Requerimientos'
        when 2 then 'Diseño'
        when 3 then 'Desarrollo'
        when 4 then 'QA'
        when 5 then 'Producción'
      end;

      select coalesce(max(sort_order), -1) + 1 into siguiente_orden
      from requirement_tasks
      where requirement_id = fila.requirement_id and phase_number = fila.phase_number;

      insert into requirement_tasks (
        requirement_id, phase_number, phase_name, task_name, status, due_date, sort_order
      ) values (
        fila.requirement_id, fila.phase_number, nombre_fase, fila.title, 'Completada',
        fila.logged_at::date, siguiente_orden
      )
      returning id into tarea_id;
    end if;

    -- Dispara el trigger de C1 (trg_activity_logs_executed_hours_tarea_iu),
    -- que recalcula requirement_tasks.executed_hours de la tarea afectada.
    update activity_logs set task_id = tarea_id where id = fila.id;
  end loop;
end $$;

-- ROLLBACK:
-- (revertir la migración de datos no es automático: identificar las tareas
-- creadas por este bloque por status='Completada' y sort_order asignado hoy
-- si hiciera falta deshacerlo a mano)
-- drop policy if exists "admin_delete" on public.requirement_phase_deadlines;
-- drop policy if exists "admin_update" on public.requirement_phase_deadlines;
-- drop policy if exists "admin_insert" on public.requirement_phase_deadlines;
-- drop policy if exists "read_authenticated" on public.requirement_phase_deadlines;
-- drop table if exists requirement_phase_deadlines;
