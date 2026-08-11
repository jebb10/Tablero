-- Baseline de la Unidad 0.1 (Fase 0, Fundaciones) — describe el estado ACTUAL de
-- producción tal como se verificó en la Unidad 0.0 (2026-08-07), no la
-- historia de cómo se llegó a él. Se marca como "ya aplicada" con
-- `supabase migration repair` (no se ejecuta contra prod): prod ya tiene
-- exactamente este esquema desde la Fase A.
--
-- Diferencias respecto al legado `supabase/legado/schema-fase-a.sql`:
--   - Ninguna en DDL: `milestone` ya era `text` (no se necesitó el ALTER
--     documentado como pendiente en versiones previas del roadmap).
--   - El seed de `projects` pasa a ser idempotente (`on conflict do nothing`)
--     porque una migración sí puede volver a aplicarse en un entorno nuevo
--     (por ejemplo, el proyecto Supabase desechable de la prueba de
--     restauración de la Unidad 0.5).

create extension if not exists pgcrypto;

create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(255) not null unique,
  slug        varchar(255) not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table requirements (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references projects(id) on delete cascade,
  code                      varchar(255) not null,
  slug                      varchar(255) not null,
  title                     varchar(255) not null,
  category                  varchar(100),
  complexity                varchar(50),
  month_label               varchar(50),
  status                    varchar(50) not null check (status in (
                              'NO_INICIADO','EN_CURSO','PAUSADO',
                              'ENTREGADO_PRODUCCION','CERRADO_POR_CAMBIO_ALCANCE'
                            )),
  has_detail_tracking       boolean not null default false,
  parent_requirement_id     uuid references requirements(id),
  deadline                  date,
  estimated_hours           numeric(6,2) default 0,
  executed_hours            numeric(6,2) default 0,
  billing_date              text,
  notes                     text,
  documentation_folder_url  text,
  dev_environment_url       text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint requirements_code_unique_per_project unique (project_id, code),
  constraint requirements_slug_unique_per_project unique (project_id, slug)
);
create index idx_requirements_project on requirements(project_id);
create index idx_requirements_parent on requirements(parent_requirement_id);
create index idx_requirements_status on requirements(project_id, status);

create table requirement_tasks (
  id                  uuid primary key default gen_random_uuid(),
  requirement_id      uuid not null references requirements(id) on delete cascade,
  phase_number        int not null check (phase_number between 1 and 5),
  phase_name          varchar(100) not null,
  constraint requirement_tasks_phase_pair check (
    (phase_number = 1 and phase_name = 'Requerimientos') or
    (phase_number = 2 and phase_name = 'Diseño')          or
    (phase_number = 3 and phase_name = 'Desarrollo')      or
    (phase_number = 4 and phase_name = 'QA')              or
    (phase_number = 5 and phase_name = 'Producción')
  ),
  task_name           varchar(255) not null,
  detail              text,
  status              varchar(50) not null default 'Pendiente',
  estimated_hours     numeric(6,2),
  due_date            date,
  completed_date      date,
  planned_start_date  date,
  planned_end_date    date,
  milestone           text,
  blockers            text,
  notes               text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  constraint requirement_tasks_natural_key unique (requirement_id, phase_number, task_name)
);
create index idx_requirement_tasks_requirement on requirement_tasks(requirement_id);
create index idx_requirement_tasks_planned on requirement_tasks(planned_start_date, planned_end_date);

create table activity_logs (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  event_type     varchar(50) not null check (event_type in (
                    'SEGUIMIENTO','PRESENTACION_FLUJO','GESTION_DOCUMENTAL',
                    'REFINAMIENTO_TECNICO','OTRO'
                  )),
  title          varchar(255) not null,
  notes          text,
  hours_spent    numeric(5,2) default 0,
  logged_at      timestamptz not null default now()
);
create index idx_activity_logs_requirement on activity_logs(requirement_id);

create table document_versions (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  document_name  varchar(255) not null,
  file_url       text not null,
  version        varchar(20) not null default 'v1.0',
  uploaded_at    timestamptz not null default now()
);
create index idx_document_versions_requirement on document_versions(requirement_id);

-- RLS: Fase A no tiene Auth todavía. SELECT público; se reemplaza por
-- policies basadas en auth.uid() en la Unidad B.4.
alter table projects enable row level security;
alter table requirements enable row level security;
alter table requirement_tasks enable row level security;
alter table activity_logs enable row level security;
alter table document_versions enable row level security;

create policy "public read projects" on projects for select using (true);
create policy "public read requirements" on requirements for select using (true);
create policy "public read requirement_tasks" on requirement_tasks for select using (true);
-- activity_logs/document_versions: RLS habilitado sin policy de select pública
-- todavía (verificado en la Unidad 0.0 -- cero policies, ambas ilegibles
-- hoy vía API). Se resuelve en C3.1 y D.1 respectivamente.

insert into projects (name, slug, description)
values ('Positiva Web 414', 'positiva-web-414', 'Proyecto Positiva Web — bolsas de horas 414 (migrado desde Excel)')
on conflict (slug) do nothing;

-- ROLLBACK:
-- drop table document_versions;
-- drop table activity_logs;
-- drop table requirement_tasks;
-- drop table requirements;
-- drop table projects;
