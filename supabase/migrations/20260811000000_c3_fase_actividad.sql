alter table activity_logs
  add column phase_number int check (phase_number between 1 and 5);

alter table activity_logs
  alter column event_type set default 'OTRO';

comment on column activity_logs.phase_number is
  'Fase del requerimiento (1-5, ver FASES_ORDEN en src/lib/fases-orden.ts). NULL en filas anteriores a esta migración.';

-- ROLLBACK:
-- alter table activity_logs alter column event_type drop default;
-- alter table activity_logs drop column phase_number;
