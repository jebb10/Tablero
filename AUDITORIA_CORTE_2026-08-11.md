# Auditoría integral pre-corte (2026-08-11)

Corte solicitado por el PO antes de entrar a refinamiento visual de pantallas, ignorando el historial de fases pasadas. Objetivo: dejar un contrato de datos claro, confirmar que la BD está bien configurada, y mapear la deuda técnica real en el código antes de tocar diseño.

**Salud automática (verificada, todo en verde)**: `tsc --noEmit` limpio, `eslint` limpio, `vitest run` 51/51, `next build` compila las 13 rutas sin error.

Auditoría hecha con 4 agentes en paralelo, cada uno restringido a una capa: contrato de datos, esquema BD/RLS/migraciones, Server Actions/responsabilidades, componentes/deuda UI.

---

## 1. Bloqueante antes de refinar (afecta directamente el contrato o el costo de rediseñar)

| # | Hallazgo | Ubicación | Por qué bloquea |
|---|---|---|---|
| B1 | `Tarea.estado` sigue tipado `string \| null` en vez de `EstadoTarea` | `src/lib/types.ts:66` | El campo `status` es un `CHECK` de 6 valores desde C2.1 (`estados-tarea.ts`), pero el tipo de dominio no lo refleja — justo el campo que el refinamiento va a tocar. |
| B2 | `tarea-acciones-admin.tsx` mezcla 4 `useActionState` distintos + `window.confirm` + auto-submit de `<select>` crudo en un solo componente (230 líneas) | `src/components/tarea-acciones-admin.tsx` | Cualquier maqueta nueva de "controles de tarea" tiene que decidir sobre 4 mecanismos de estado a la vez. Hay que partirlo antes de rediseñar. |
| B3 | `formatearFecha()` reimplementada casi igual en 4 archivos; `src/lib/fechas.ts` (creado para esto en C1.4) sigue sin consumidores | `dashboard-client.tsx:48-51`, `tareas-por-fase.tsx:10-13`, `actividades-sin-fase.tsx:8-12`, `requerimiento-card.tsx:18-25` | Un ajuste visual de formato de fecha (típico en refinamiento) obliga a tocar 4 archivos en vez de uno. |
| B4 | `requerimiento-form.tsx` y `tarea-acciones-admin.tsx` usan `<select>`/`<input type="date">`/`<textarea>` HTML crudos en vez de los componentes shadcn ya instalados (`Select`, `Textarea`, `checkbox.tsx`, `alert-dialog.tsx` — instalados en C2.5 y sin usar) | `requerimiento-form.tsx:114-125,154,174-182`, `tarea-acciones-admin.tsx:88,166-178,188-206`, `registrar-horas-dialog.tsx:65-70` | El `window.confirm()` nativo no se puede estilizar en absoluto. Refinar encima de controles crudos es más caro que unificarlos primero a shadcn. |

## 2. Deuda técnica (documentar/decidir, no bloqueante hoy)

**Capa de datos**
- 4 `Pick<...>` ad-hoc distintos sobre `requirements` sin adaptador común (`dashboard-data.ts`, `requerimiento-data.ts` ×2, `planeacion-data.ts`); dos rutas de agrupación por fase separadas (`fases.ts` vs. inline en `planeacion-data.ts`).
- `estados.ts` ("fuente única de estados") no se usa de punta a punta — `requerimiento-data.ts:116` y `actions/requirements.ts:200` comparan el literal `"CERRADO_POR_CAMBIO_ALCANCE"` a mano.
- `database.types.ts` desincronizado: falta la tabla `_backup_activity_logs_horas_huerfanas` creada en el último hotfix (PR #16) — `npm run types:db` no corrió tras esa migración.
- Validación solo en escritura (zod únicamente en `guardarFechasPlaneadas`); el resto de Server Actions valida a mano (`typeof x !== "string"`). `dev_environment_url` no tiene validación de formato en servidor.
- Caché in-memory asimétrica: Home la tiene (`dashboard-data.ts`), Planeación no — riesgo bajo de que ambas vistas muestren datos distintos tras un fallo transitorio de Supabase.
- `EventoActividad` exportado en `actividades-data.ts` sin uso real (`Actividad.eventType` es `string` suelto).

**Base de datos**
- FKs sin `ON DELETE` explícito: `requirements.parent_requirement_id`, `activity_logs.created_by` (caen en `NO ACTION` por defecto, inconsistente con el resto del esquema que sí es explícito).
- Falta índice en `activity_logs.task_id`, filtrado en cada trigger de horas (impacto bajo hoy, tabla pequeña).
- `requirement_phase_deadlines.updated_at` no tiene trigger (a diferencia de `requirements`/`requirement_tasks`).
- `executed_hours` (derivada por trigger) no está protegida contra `UPDATE` directo a nivel BD — solo por convención de código.
- Columnas candidatas a huérfanas: `requirements.parent_requirement_id` (jerarquía nunca usada), `requirements.billing_date` (tipo `text`, resabio del Excel), `requirement_tasks.completed_date`, `requirement_tasks.detail`.
- `document_versions`: RLS habilitado sin ninguna policy (cerrada por completo, intencional — Fase D no empezada) y esquema a medio definir (`version` sin historial real). **Decisión pendiente del PO**: dejarla tal cual hasta diseñar Fase D, o eliminarla ahora y recrearla cuando se retome.

**Server Actions / componentes**
- Patrón `successVisto` (cerrar diálogo tras éxito) duplicado línea por línea en 3 diálogos; `aInputDate()` duplicada en 2 archivos.
- `actividades-sin-fase.tsx` + `actividad-tipos.ts`: legacy intencional del histórico pre-fusión tarea/actividad (2026-08-11) — sigue siendo necesario, pero conviene que el PO decida explícitamente si se archiva visualmente o se mantiene visible antes de rediseñar esa zona.

## 3. Cosmético

- `CLAUDE.md` desactualizado en 2 puntos: dice que `activity_logs`/`document_versions` "siguen sin policies" (falso para `activity_logs` desde Fase C) y sigue documentando `agregarActividad()`, que ya se renombró a `registrarHoras()` en la fusión tarea/actividad.
- Indentación JSX inconsistente en el bloque de filtros de `dashboard-client.tsx` (líneas 180-219).
- `planeacion-client.tsx` usa una prop `esAdmin` en vez de `RoleGate` para el botón "Editar fechas" (Server Component no puede anidarse ahí) — mismo resultado de seguridad, mecanismo distinto, ya documentado en el propio código.

## 4. Sin hallazgos — confirmado en buen estado

- `requireAdmin()`/`requireAuth()` al inicio de las 9 Server Actions de escritura, sin excepciones.
- Contrato de retorno `{error, success}` uniforme en los 8 tipos de estado — ya hay base sólida para pantallas nuevas.
- `src/app/actions/requirements.ts` (C2.3) completo, sin TODOs, con manejo explícito de no-transaccionalidad documentado en comentario, no como pendiente oculto.
- Patrón `refresh()`/`router.refresh()` correcto y replicado donde hacía falta.
- RLS sin gaps por error en ninguna tabla; todas las FK de negocio (`project_id`, `requirement_id`, `task_id`) con `ON DELETE CASCADE` coherente.
- Backup (`backup.yml`) hace dump por esquema completo — cubre automáticamente cualquier tabla nueva, no depende de mantener una lista.
- Sin componentes 100% muertos (todos los `.tsx` fuera de `ui/` tienen al menos un consumidor real).

## Esquema final reconstruido (referencia rápida)

| Tabla | RLS | Notas clave |
|---|---|---|
| `projects` | authenticated | sin cambios desde Fase A |
| `requirements` | authenticated select / admin write | `executed_hours`/`reopened_count` derivadas por trigger |
| `requirement_tasks` | authenticated select / admin write | `status` CHECK 6 valores; `executed_hours` derivada por trigger |
| `activity_logs` | authenticated select / admin insert (append-only) | `task_id` → `on delete cascade` (hotfix PR #16) |
| `requirement_phase_deadlines` | authenticated select / admin write | sin trigger de `updated_at` |
| `document_versions` | RLS habilitado, **0 policies** | vacía, Fase D no empezada — cerrada por completo vía API |

---

**Siguiente paso**: decidir con el PO qué de la sección 1 (bloqueante) se corrige antes de abrir refinamiento visual, y qué de la sección 2 se acepta como deuda documentada vs. se corrige ahora en batch.
