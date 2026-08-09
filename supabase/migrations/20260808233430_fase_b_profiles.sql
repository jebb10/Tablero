-- Unidad B.2 (ROADMAP_V2.md) — tabla de roles, función de rol y policies
-- mínimas de profiles. NO toca las policies de lectura pública existentes
-- en requirements/requirement_tasks: el sitio sigue siendo público hasta
-- el flip de RLS de la Unidad B.4.

create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','viewer')),
  full_name  text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- IMPORTANTE: NO usar "force row level security" — is_admin() es
-- security definer y su dueño (postgres) es dueño de la tabla, RLS no
-- aplica al dueño salvo que se fuerce explícitamente. Forzarlo rompería
-- is_admin() con recursión infinita (ver ROADMAP_V2.md, Unidad B.2).

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles p
                 where p.user_id = auth.uid() and p.role = 'admin');
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

create policy "profiles_self_read" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ROLLBACK:
-- drop policy if exists "profiles_admin_all" on public.profiles;
-- drop policy if exists "profiles_self_read" on public.profiles;
-- revoke execute on function public.is_admin() from authenticated;
-- drop function if exists public.is_admin();
-- drop table if exists public.profiles;
