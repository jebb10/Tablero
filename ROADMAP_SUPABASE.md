# ⚠️ SUPERADO — leer `ROADMAP_V2.md`

Este documento queda **superado** desde el 2026-08-06 por `ROADMAP_V2.md` (en la raíz del repo),
escrito tras una auditoría profunda del código y de la base de datos reales. Contiene 14 puntos que
contradicen lo que hay en disco hoy (columnas y triggers que no existen, patrones de edición
imposibles con los componentes actuales, decisiones ya revertidas por el PO). **No ejecutar nada
desde aquí.** Este archivo se conserva solo como resumen ejecutivo de la Fase A y del cuestionario de
descubrimiento previo a ella — el detalle completo (DDL campo a campo, mapeo de columnas Excel→Supabase,
diseño de Fase B/C/D en borrador) se recortó el 2026-08-09 porque ya no aporta nada vivo: la migración
está ejecutada y verificada, y el diseño de las fases siguientes vive, completo y vigente, en
`ROADMAP_V2.md`. Si algún día se necesita ese detalle histórico, sigue disponible en el historial de git.

**Fase A: ✅ ejecutada y verificada (2026-08-06).** Próximo paso: Fase B (Supabase Auth + roles
Admin/Viewer) — diseño completo en `ROADMAP_V2.md`.

## Cierre de Fase A (2026-08-06)

**Ejecutada de punta a punta en una sola sesión**, con el PO confirmando las 5 preguntas de descubrimiento
en vivo (respuestas: enum de `status` se queda igual, umbrales de semáforo 3/10 días confirmados, semáforo
y borde de "bloqueado" **conviven**, riesgo de pausa por inactividad de Supabase free **aceptado** sin ping
preventivo, botón "Sincronizar" **retirado** por completo, no re-etiquetado).

**Punto bloqueante resuelto durante la ejecución**: se inspeccionaron las 4 hojas Gantt ocultas del Excel
real. El match por nombre exacto de tarea **no fue viable** (nombres genéricos, repetidos entre
requerimientos, sin correspondencia con `task_name` de las hojas de detalle). Se activó el fallback ya
previsto: `planned_start_date`/`planned_end_date` quedaron `NULL` para las tareas migradas, y `/planeacion`
usa `due_date` como marcador de un día.

**Desviación respecto al DDL original**: `requirement_tasks.milestone` se cambió de `varchar(255)` a
`text` — un hito real de la hoja "Wompi" tenía 264 caracteres y rompió la migración.

**Verificación real ejecutada** (no solo el reporte del script): 28 requerimientos migrados, 7 con
`has_detail_tracking`, conteos de tareas por hoja coinciden con el Excel original. Dashboard, drill-down
y `/planeacion` probados en `npm run dev` contra la base de datos real (no mocks) — sin banner de error,
datos reales visibles.

**El `.xlsx` legado y el Google Sheet que lo alimentaba ya NO son la fuente de datos de la app ni
requieren mantenimiento.** El archivo `.xlsx` se borró físicamente el 2026-08-06 (decisión explícita del
PO, una vez la migración quedó verificada). La estrategia de backup de Supabase que este cierre dejaba
pendiente **ya se resolvió**: ver la sección "Backup" de `CLAUDE.md` y la Unidad 0.5 de `ROADMAP_V2.md`.

**Punto de atención heredado a `ROADMAP_V2.md`**: refinar el diagrama de Gantt (`/planeacion`), ya que
con `planned_start_date`/`planned_end_date` en `NULL` las barras son todas marcadores de un día — ver
Unidad C1.1 de `ROADMAP_V2.md` (semillado de fechas planeadas) para el diseño de la solución.
