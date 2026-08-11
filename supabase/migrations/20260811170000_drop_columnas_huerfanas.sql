-- Cierre de deuda técnica (2026-08-11) — elimina 2 columnas huérfanas
-- confirmadas sin ningún consumidor de lectura real en el código:
--   * requirements.billing_date: solo se leía en dashboard-data.ts
--     (fechaCobro) y era editable desde el formulario de requerimiento,
--     pero nunca se renderizaba en ninguna pantalla.
--   * requirement_tasks.completed_date: solo se leía en fases.ts
--     (fechaReal) y nunca se escribía desde ninguna Server Action ni se
--     renderizaba en ninguna pantalla.
-- (Otras 2 candidatas del mismo análisis, requirements.parent_requirement_id
-- y requirement_tasks.detail, SÍ tienen consumidores de negocio reales y no
-- se tocan.)
--
-- ROLLBACK: recrear las columnas (quedan sin datos, ninguno era consumido):
--   alter table requirements add column billing_date text;
--   alter table requirement_tasks add column completed_date date;

alter table requirements drop column billing_date;
alter table requirement_tasks drop column completed_date;
