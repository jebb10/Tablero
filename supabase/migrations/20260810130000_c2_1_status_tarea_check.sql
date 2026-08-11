-- Unidad C2.1 (Fase C2, CRUD) — constreñir requirement_tasks.status a un
-- conjunto canónico. Consulta real corrida en producción el 2026-08-10
-- (165 filas): 'Completada' (148), 'En curso' (9), 'Pendiente' (5),
-- 'No iniciada' (3) -- sin variantes de mayúsculas/espacios. 'Bloqueada' y
-- 'Cancelada' no existen hoy en los datos, pero el PO las quiere incluidas
-- para uso futuro desde el formulario de edición de C2.2.
--
-- Los 4 valores reales ya coinciden exactamente con los nombres canónicos
-- decididos con el PO -- no hace falta ningún UPDATE de normalización antes
-- del CHECK, a diferencia de lo que anticipaba el diseño original del
-- roadmap (que asumía texto libre sucio).

alter table requirement_tasks
  add constraint requirement_tasks_status_check
  check (status in ('No iniciada', 'Pendiente', 'En curso', 'Bloqueada', 'Completada', 'Cancelada'));

comment on column requirement_tasks.status is
  'Conjunto canónico de 6 valores, ver src/lib/estados-tarea.ts (ESTADOS_TAREA). Bloqueada/Cancelada sin uso real a la fecha de esta migración, habilitados para el formulario de edición de C2.2.';

-- ROLLBACK:
-- alter table requirement_tasks drop constraint requirement_tasks_status_check;
