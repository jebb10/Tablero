# Plan de ejecución — Unidad C3 (redefinida): actividad por Fase + modal compartido

> Copia de trabajo del plan aprobado el 2026-08-10 (fuente:
> `~/.claude/plans/primero-quiero-que-revises-purring-hamming.md`). **Pendiente de ejecutar**
> — el PO pidió guardarlo para correrlo en otra sesión, sin ejecutar todavía. Redefine la
> sección "Unidad C3.2" de `PLAN_EJECUCION_C2_C3.md`; leer ese archivo primero para el
> contexto general de la ronda C2/C3 antes de ejecutar esta unidad.
>
> **Estado al guardar este plan**: la Unidad C2.5 está commiteada y pusheada en la rama
> `fase-c2-5` (PR #13, https://github.com/jebb10/Tablero/pull/13), **sin mergear todavía** —
> pendiente de verificación manual en navegador por el PO (ver checklist al final de este
> archivo) antes de aprobar/mergear. Esta unidad C3 debe crearse como rama nueva **a partir
> de `fase-c2-5`**, no de `main` (ver razón en "Decisiones" abajo), y su PR debe mergearse
> **después** del PR #13.

## Contexto

Durante la verificación manual del PR #13 (Unidad C2.5), el PO detectó dos problemas de
diseño en el modal "Añadir actividad" que la Unidad C3.2 original (`PLAN_EJECUCION_C2_C3.md`)
no contemplaba correctamente:

1. El campo **"Tipo"** (`event_type`, 5 valores fijos sin relación con el trabajo real:
   `SEGUIMIENTO`/`PRESENTACION_FLUJO`/`GESTION_DOCUMENTAL`/`REFINAMIENTO_TECNICO`/`OTRO`) no
   sirve para saber en qué fase del requerimiento quedó la actividad. Se reemplaza por un
   selector de **Fase** (las 5 fases reales: Requerimientos/Diseño/Desarrollo/QA/Producción),
   obligatorio, para que cada actividad quede clasificada por fase.
2. Hoy Planeación (`/planeacion/[requerimiento]/editar`) no tiene ninguna forma de registrar
   actividades — solo el Detalle del requerimiento la tiene, con su propio modal (overlay
   manual, no el `Dialog` de shadcn). Como ambas pantallas describen el mismo concepto (la
   bitácora de un requerimiento), el modal de "Añadir actividad" se **unifica en un solo
   componente compartido**, usado en ambos lugares.

Decisiones tomadas con el PO para esta unidad (confirmadas explícitamente):
- **`event_type` se mantiene en la base de datos, sin backfill**: las filas históricas de
  Fase C conservan su clasificación vieja; el campo simplemente deja de pedirse en el
  formulario. Se le pone un `default 'OTRO'` para que los inserts nuevos no necesiten
  proveerlo (la columna sigue siendo `not null`).
- **Nueva columna `activity_logs.phase_number`** (independiente de `task_id`, que ya existe):
  `int`, nullable (las filas viejas quedan sin fase), `check (phase_number between 1 and 5)`.
- **El modal se reconstruye usando `Dialog` de shadcn** (instalado en la Unidad C2.5, sin
  consumidores todavía) en vez del overlay manual actual — es la razón por la que C2.5 lo
  instaló.
- **Alcance de la unificación**: solo el modal/formulario de "agregar actividad" es
  compartido. El historial (`registro-actividades.tsx`) sigue siendo exclusivo del Detalle;
  Planeación solo gana el botón + modal para registrar, no una vista de historial.
- **Ubicación en Planeación**: el botón va en `/planeacion/[requerimiento]/editar`, junto al
  formulario de fechas/tareas que ya existe ahí (mismo nivel de granularidad, un
  requerimiento a la vez). Esa página ya exige `requireAdmin()` a nivel de página — no hace
  falta envolver el botón en `RoleGate` ahí (a diferencia del Detalle, que sí lo necesita
  porque la página es visible para Viewers).
- **Orden**: esta unidad se ejecuta antes de seguir con C2.2. Redefine por completo el punto 1
  y 2 de la sección "Unidad C3.2" de `PLAN_EJECUCION_C2_C3.md` (que asumía que `event_type`
  se mantenía tal cual en el formulario).
- **Git**: rama nueva creada **a partir de `fase-c2-5`** (no de `main`), porque esta unidad
  edita directamente `src/app/actions/activity-logs.ts`, que C2.5 acaba de reubicar — crearla
  desde `main` obligaría a rehacer ese traslado. El PR de esta unidad se abre con base
  `fase-c2-5`; al mergear el PR #13 de C2.5, GitHub reapunta automáticamente la base a `main`.

## Estado verificado del código (no re-verificar en ejecución)

- `activity_logs.event_type` — CHECK real en
  `supabase/migrations/20260101000000_baseline_fase_a.sql:89-92` (5 valores, `not null`, sin
  default hoy). Único índice de la tabla: `idx_activity_logs_requirement` (sobre
  `requirement_id`), no toca `event_type`. Ningún trigger depende de `event_type`.
- `FASES_ORDEN` (`src/lib/fases-orden.ts`, 8 líneas): `{ numero: number; nombre: string }[]`,
  5 entradas (`1 Requerimientos … 5 Producción`). Mismo shape que usa
  `requirement_tasks.phase_number`/`phase_name` (con su propio CHECK de pares, migración
  base) — no hay tabla de fases, es un array TS.
- `src/lib/actividad-tipos.ts` (`TIPOS_ACTIVIDAD_VALIDOS`/`TIPO_ACTIVIDAD_LABEL`): **no se
  elimina** — sigue siendo necesario en `registro-actividades.tsx` para el fallback de las
  filas históricas sin `phase_number`.
- `src/app/actions/activity-logs.ts` (movido en C2.5): `agregarActividad(requirementId,
  prevState, formData)`, `requireAdmin()` primero, valida `eventType`/`title`, inserta con
  `event_type: eventType`. Es el único punto de escritura de `event_type` hoy.
- `src/components/boton-agregar-actividad.tsx` (149 líneas): overlay manual (`fixed inset-0
  ... bg-black/35`), NO usa `Dialog` de shadcn. Campo `eventType` (`<select>` con
  `TIPO_ACTIVIDAD_LABEL`), `title`, `taskId` opcional (sin filtrar por fase), `notes`,
  `hoursSpent`, `loggedAt`. Exporta `TareaParaActividad = { id: string; taskName: string }`
  (sin `phaseNumber` — hay que agregarlo).
- `src/app/requerimiento/[item]/page.tsx:88-99`: usa `RegistroActividades` +
  `RoleGate role="admin"` + `BotonAgregarActividad`, con
  `tareas={(fases ?? []).flatMap((f) => f.tareas.map((t) => ({ id: t.id, taskName: t.tarea })))}`.
  **`Fase` (tipo en `src/lib/types.ts:78-83`) solo tiene `nombre`, no `numero`** — pero
  `agruparPorFase()` (`src/lib/fases.ts:43`) siempre mapea `FASES_ORDEN` en orden (5 entradas
  fijas, una por fase, incluso vacías), así que `fases[i]` corresponde siempre a
  `FASES_ORDEN[i]`. La forma más simple de obtener el número de fase de cada tarea en este
  `flatMap` es usar el índice: `FASES_ORDEN[i].numero`, sin tocar los tipos `Fase`/`Tarea`
  compartidos.
- `src/lib/planeacion-data.ts:39-47` (`TareaParaEdicion`) **ya tiene `phaseNumber`** por
  tarea — Planeación no necesita ningún truco de índice, el dato ya está.
- `src/app/planeacion/[requerimiento]/editar/page.tsx`: llama `requireAdmin()` en la
  línea 15, antes de cualquier render — confirma que no hace falta `RoleGate` adicional ahí.
- `src/lib/actividades-data.ts` (`getActividades`): `select("id, event_type, title, notes,
  hours_spent, logged_at, created_by, task_id")` — sin `phase_number` todavía, sin join a
  `requirement_tasks`. Tipo `Actividad` no tiene campo de fase.
- `src/components/registro-actividades.tsx:36-38`: único punto donde se muestra
  `TIPO_ACTIVIDAD_LABEL[a.eventType]` como chip — se reemplaza por el nombre de fase cuando
  exista, con fallback al tipo viejo para filas históricas.
- Patrón de migración de referencia: `supabase/migrations/20260810120000_c1_ext_horas_por_tarea.sql`
  (columna + comentario + rollback documentado). La migración nueva es más simple (sin
  trigger, no hay valor derivado que sincronizar).

## Pasos de ejecución

1. **Git**: `git checkout -b fase-c3-fase-actividad` a partir de `fase-c2-5` (con `fase-c2-5`
   ya pusheado). Si para entonces el PR #13 ya se mergeó a `main`, crear la rama desde `main`
   en su lugar (el traslado de C2.5 ya estaría ahí).
2. **Migración** `supabase/migrations/<timestamp>_c3_fase_actividad.sql` (timestamp posterior
   al de `20260810120000`, mismo día o el día real de ejecución):
   ```sql
   alter table activity_logs
     add column phase_number int check (phase_number between 1 and 5);

   alter table activity_logs
     alter column event_type set default 'OTRO';

   comment on column activity_logs.phase_number is
     'Fase del requerimiento (1-5, ver FASES_ORDEN en src/lib/fases-orden.ts). NULL en filas anteriores a esta migración.';

   -- ROLLBACK:
   -- alter table activity_logs alter column event_type drop default;
   -- alter table activity_logs drop column phase_number;
   ```
   `npm run db:push` (dry-run primero), luego `npm run types:db` para regenerar
   `src/lib/supabase/database.types.ts`.
3. **`src/app/actions/activity-logs.ts`**: quitar `eventType`/`TIPOS_ACTIVIDAD_VALIDOS` del
   flujo; agregar validación de `phaseNumberRaw = formData.get("phaseNumber")` → número entre
   1 y 5 (usar `FASES_ORDEN.some(f => f.numero === phaseNumber)`) → error si falta o es
   inválido. `insert` pasa a incluir `phase_number: phaseNumber` y ya no incluye
   `event_type` (queda el `default 'OTRO'` de la migración).
4. **Nuevo componente compartido** `src/components/agregar-actividad-dialog.tsx` (reemplaza a
   `src/components/boton-agregar-actividad.tsx`, que se elimina):
   - Export `TareaParaActividad = { id: string; taskName: string; phaseNumber: number }`.
   - `AgregarActividadDialog({ requirementId, tareas }: { requirementId: string; tareas: TareaParaActividad[] })`.
   - `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter` de
     `@/components/ui/dialog` (patrón ya usado en `dialog.tsx`, `render={<Button/>}` para el
     trigger, igual que `sheet.tsx`). `open` controlado por `useState`, se cierra con
     `useEffect` sobre `state.success` (mismo patrón que hoy).
   - Campo `phaseNumber` (`<select>` con opciones de `FASES_ORDEN`, `required`, sin
     `defaultValue` — placeholder "Selecciona una fase"). `useState` local para la fase
     elegida.
   - Campo `taskId` (opcional): la lista de `tareas` se filtra por `t.phaseNumber ===
     faseElegida` cuando hay una fase elegida (si no hay tareas en esa fase, el select no se
     renderiza, igual que hoy con `tareas.length > 0`). Resetear `taskId` si cambia la fase.
   - Resto de campos (`title`, `notes`, `hoursSpent`, `loggedAt`) sin cambios.
5. **Actualizar los 2 consumidores**:
   - `src/app/requerimiento/[item]/page.tsx`: importar `AgregarActividadDialog` en vez de
     `BotonAgregarActividad`; el `flatMap` de `tareas` pasa a incluir `phaseNumber:
     FASES_ORDEN[i].numero` (import `FASES_ORDEN` en este archivo). Se mantiene el
     `RoleGate role="admin"` que ya lo envuelve.
   - `src/app/planeacion/[requerimiento]/editar/page.tsx`: agregar
     `<AgregarActividadDialog requirementId={datos.id} tareas={datos.tareas.map((t) => ({ id: t.id, taskName: t.taskName, phaseNumber: t.phaseNumber }))} />`
     junto al `<EditarFechasForm>` (sin `RoleGate`, la página ya es admin-only).
6. **`src/lib/actividades-data.ts`**: agregar `phase_number` al `select`, agregar
   `phaseNumber: a.phase_number` al mapeo, agregar `phaseNumber: number | null` al tipo
   `Actividad`.
7. **`src/components/registro-actividades.tsx`**: el chip de tipo pasa a mostrar la fase
   cuando `a.phaseNumber != null` (buscar nombre en `FASES_ORDEN`), con fallback a
   `TIPO_ACTIVIDAD_LABEL[a.eventType] ?? a.eventType` para las filas históricas sin fase.
   Import de `FASES_ORDEN` agregado, import de `TIPO_ACTIVIDAD_LABEL` se mantiene.
8. **Verificación de punta a punta**: `npm run typecheck`, `npm run lint`, `npm run test`
   limpios; probar en local (Admin): registrar una actividad con fase desde el Detalle y
   verificar que aparece con el nombre de fase en el historial; registrar una actividad desde
   `/planeacion/[requerimiento]/editar`; confirmar que una fila histórica (sin `phase_number`)
   sigue mostrando su `Tipo` viejo en el historial sin romperse.
9. **Git**: 1 commit, push, PR con base `fase-c2-5` (`gh pr create --base fase-c2-5`) — o base
   `main` si el PR #13 ya se mergeó para entonces.
10. **Documentación**: reescribir la sección "Unidad C3.2" de `PLAN_EJECUCION_C2_C3.md` con
    este nuevo diseño (marcarla como redefinida y hecha), actualizar la tabla de decisiones
    (#9/#10 quedan obsoletas, documentar la nueva), y actualizar `CLAUDE.md` ("Estado actual"
    + tabla de archivos clave: `agregar-actividad-dialog.tsx` reemplaza a
    `boton-agregar-actividad.tsx`).

## Riesgos / puntos a vigilar durante la ejecución

- Confirmar que `agruparPorFase()` efectivamente nunca reordena ni filtra las 5 entradas de
  `FASES_ORDEN` antes de asumir que `fases[i]` ↔ `FASES_ORDEN[i]` es seguro en el `flatMap`
  de `page.tsx` (ya verificado en el código leído, pero revisar si algo cambió).
  `agruparPorFase` (`src/lib/fases.ts:43`) itera con `FASES_ORDEN.map(...)`, así que el orden
  y el conteo (siempre 5) están garantizados.
- El PR de esta unidad, si se abre con base `fase-c2-5`, debe actualizarse a base `main`
  (GitHub lo hace solo) recién cuando el PR #13 se mergee — no mergear este PR antes que el
  #13. Si al ejecutar esta unidad el PR #13 ya está mergeado, este punto no aplica (crear la
  rama directamente desde `main`, ver paso 1).
- La regeneración de `database.types.ts` requiere las credenciales de Supabase — usar
  `node --env-file` con el `.env.local` local, no `!` de shell (ver housekeeping del Paso 0
  de `PLAN_EJECUCION_C2_C3.md`).

## Checklist de verificación manual pendiente del PR #13 (C2.5)

Antes de aprobar/mergear https://github.com/jebb10/Tablero/pull/13, con sesión Admin en
`http://localhost:3000`:
1. Banner de error → botón "Reintentar" (fuerza `refresh()`).
2. Detalle de un requerimiento → "Añadir actividad" (nota: el campo "Tipo" de este modal se
   reemplaza por "Fase" en la unidad de este mismo archivo — probar la versión actual tal
   cual está en el PR #13, sin ese cambio todavía).
3. `/planeacion/[requerimiento]/editar` → "Guardar fechas", "Crear tarea", "Eliminar tarea".

Ninguno de los 3 debería tener cambio de comportamiento respecto a antes de C2.5 (esa unidad
solo reubicó código).
