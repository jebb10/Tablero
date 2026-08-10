-- Code review de Fase C (2026-08-09): profiles_self_read solo deja leer el
-- propio perfil, así que un Viewer no podía ver el nombre del autor de una
-- actividad creada por el Admin (getActividades() resolvía "—" en casi
-- todos los casos). Mismo patrón que is_admin() (security definer, acceso
-- de solo lectura mínimo y explícito) en vez de abrir toda la tabla
-- profiles a cualquier autenticado.

create or replace function public.nombre_autor(p_user_id uuid) returns text
language sql security definer stable set search_path = public as $$
  select full_name from public.profiles where user_id = p_user_id;
$$;
revoke execute on function public.nombre_autor(uuid) from public, anon;
grant  execute on function public.nombre_autor(uuid) to authenticated;

-- ROLLBACK:
-- revoke execute on function public.nombre_autor(uuid) from authenticated;
-- drop function if exists public.nombre_autor(uuid);
