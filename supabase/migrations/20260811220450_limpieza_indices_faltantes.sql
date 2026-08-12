-- Limpieza de esquema: índices faltantes sobre columnas ya existentes.
-- No cambia ningún resultado de consulta, solo su costo — el resto de FKs
-- equivalentes ya tenían su índice, estas dos quedaban sin cubrir:
--   * activity_logs.created_by: única columna de autoría de la bitácora,
--     sin índice pese a ser FK a auth.users.
--   * requirement_tasks.assignee: texto libre (no es FK), pero se filtra
--     por él en reportes de horas por persona.
--
-- ROLLBACK:
--   drop index if exists idx_activity_logs_created_by;
--   drop index if exists idx_requirement_tasks_assignee;

create index if not exists idx_activity_logs_created_by
  on activity_logs (created_by);

create index if not exists idx_requirement_tasks_assignee
  on requirement_tasks (assignee);
