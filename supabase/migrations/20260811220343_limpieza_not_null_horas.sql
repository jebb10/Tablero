-- Limpieza de esquema (solo consistencia, sin cambio de comportamiento):
-- requirements.executed_hours y activity_logs.hours_spent quedan NOT NULL.
--
-- requirements.executed_hours: es derivada por trigger (siempre calculada,
-- nunca insertada en NULL por ningún flujo de escritura actual) — verificado
-- 0 filas NULL en producción antes de este cambio. Iguala su nullabilidad a
-- requirement_tasks.executed_hours, que ya es NOT NULL desde su creación.
--
-- activity_logs.hours_spent: sí tenía 5 filas NULL en producción (notas de
-- bitácora sin horas asociadas — reuniones, bloqueos, notas de despliegue).
-- Decisión del PO (2026-08-11): son horas 0, no un valor pendiente; se
-- normalizan a 0 antes de aplicar el constraint. No cambia ningún cálculo:
-- los triggers de recálculo ya usan estas filas vía SUM(), que trata NULL
-- igual que 0.
--
-- ROLLBACK:
--   alter table requirements alter column executed_hours drop not null;
--   alter table activity_logs alter column hours_spent drop not null;
--   -- (las 5 filas normalizadas a 0 no se revierten a NULL: no había forma
--   -- de saber si el valor original era "sin horas" o "no diligenciado")

update activity_logs set hours_spent = 0 where hours_spent is null;

alter table requirements alter column executed_hours set not null;
alter table activity_logs alter column hours_spent set not null;
