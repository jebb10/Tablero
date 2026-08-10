-- Unidad C1.2 — RPC atómica para guardar fechas planeadas editadas a mano
-- desde la nueva pantalla de edición (/planeacion/[requerimiento]/editar).
-- security invoker: NO eleva privilegios, hereda el usuario que llama, así
-- que la policy admin_update de requirement_tasks (public.is_admin()) sigue
-- aplicando exactamente igual que un update directo. Un Viewer que la
-- invoque por API directa recibe el mismo rechazo de RLS que ya recibiría
-- con un update normal.
create or replace function public.rpc_set_planned_dates(filas jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  update requirement_tasks rt
  set
    planned_start_date = f.inicio,
    planned_end_date = f.fin,
    planned_dates_confirmed = true
  from jsonb_to_recordset(filas) as f(id uuid, inicio date, fin date)
  where rt.id = f.id;
end;
$$;

comment on function public.rpc_set_planned_dates(jsonb) is
  'C1.2: guardado atómico de fechas planeadas editadas por un Admin. security invoker — hereda RLS del caller, no eleva privilegios. Marca planned_dates_confirmed=true, unidireccional (nunca se revierte).';

-- El grant no otorga permiso de escritura por sí solo: security invoker +
-- RLS admin_update es lo que realmente bloquea a un Viewer autenticado.
-- Sin este grant explícito, la llamada fallaría por permiso de ejecución
-- antes de llegar siquiera a evaluar RLS.
grant execute on function public.rpc_set_planned_dates(jsonb) to authenticated;
revoke execute on function public.rpc_set_planned_dates(jsonb) from anon;

-- ROLLBACK:
-- drop function if exists public.rpc_set_planned_dates(jsonb);
