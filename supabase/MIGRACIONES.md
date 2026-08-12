# Migraciones — flujo y gotchas reales (Unidad 0.1, 2026-08-07)

## Flujo normal

1. `npm run db:new <nombre>` → crea `supabase/migrations/<timestamp>_<nombre>.sql` vacío. **Si falla
   con `LegacyMigrationNewWriteError`, ver Gotcha #3** — crear el archivo a mano.
2. Editar el `.sql`. **Regla obligatoria: todo archivo de migración termina con un bloque comentado
   `-- ROLLBACK:` con el SQL inverso** (ver `20260101000000_baseline_fase_a.sql` como ejemplo).
3. `npm run db:push -- --dry-run` (revisar la salida línea por línea). **Si falla con
   `LegacyDbConfigParseUrlError: ...%SUPABASE_DB_POOLER_URL%`, el `%VAR%` de `package.json` no se
   expandió** (visto en una sesión de PowerShell donde `npm run` no pasó por `cmd.exe`) — usar
   `npx supabase db push --db-url $env:SUPABASE_DB_POOLER_URL --dry-run` directamente.
4. `npm run db:push` (o el `npx supabase db push --db-url ...` equivalente si el script falla igual)
   para aplicar de verdad.
5. `npm run db:list` para confirmar que local y remoto coinciden.

Antes de este proyecto no había migraciones versionadas: `supabase/legado/schema-fase-a.sql` es el DDL
histórico que se corrió a mano en el SQL Editor durante la Fase A — **no ejecutarlo**, se conserva solo
como referencia. La verdad vigente es todo lo que hay en `supabase/migrations/`.

## Gotcha #1 — `supabase link` está roto en la CLI 2.112.0 para este proyecto

`npx supabase link --project-ref nllqrrmxwtmwwxzopzix` falla siempre con:

```
LegacyLinkApiKeysNetworkError: failed to get api keys: SchemaError(Expected a string matching the
RegExp ...  at [2]["inserted_at"])
```

Es un bug de la CLI al parsear la respuesta de `GET /v1/projects/<ref>/api-keys` — un `inserted_at` en
alguna de las API keys del proyecto (probablemente una de las keys `sb_publishable_`/`sb_secret_`
nuevas) no matchea el regex de fecha que espera el validador. **No es la contraseña ni la red**: el
`GET /v1/projects/<ref>` previo sí responde bien. Confirmado con `--debug`, reproducible siempre.

**Consecuencia práctica: nunca uses `--linked` en ningún comando de la CLI en este proyecto** (falla
con `LegacyProjectNotLinkedError` porque el `link` nunca terminó de escribir el project ref). **Usa
siempre `--db-url` explícito** — por eso los scripts `db:*` de `package.json` lo pasan directamente en
vez de depender de un link previo.

Si en el futuro se actualiza la CLI y quieres reintentar `supabase link` (por ejemplo para que
`supabase gen types --linked` funcione en la Unidad 0.2), probar de nuevo — puede que ya esté
arreglado en una versión más nueva. Si sigue fallando, `gen types` también acepta `--db-url` como
alternativa a `--linked`.

## Gotcha #2 — la conexión directa (`db.<ref>.supabase.co:5432`) no resuelve en esta máquina

El roadmap ya avisaba que el host directo es IPv6-only en proyectos free y que **GitHub Actions** no
tiene IPv6. Lo que no estaba confirmado es que **esta máquina Windows tampoco lo resuelve**
(`getaddrinfo ENOTFOUND`) — no es solo un problema de CI. **Usar siempre el Session Pooler**
(`SUPABASE_DB_POOLER_URL` en `.env.local`) tanto en local como en GitHub Actions. No se investigó la
causa exacta (¿falta de ruta IPv6 del ISP/router?) porque el pooler cubre ambos casos sin más trabajo.

## Gotcha #3 — `supabase migration new` falla en esta instalación

`npm run db:new <nombre>` falla con
`LegacyMigrationNewWriteError: AlreadyExists: FileSystem.makeDirectory (...\migrations)` aunque el
directorio ya exista y sea válido (bug similar al de `supabase link`, Gotcha #1). **Workaround:** crear
el archivo a mano con `New-Item` (nunca `-Force`, para no truncar nada), usando
`Get-Date -Format "yyyyMMddHHmmss"` como timestamp, respetando el patrón `<timestamp>_<nombre>.sql`
exigido por la CLI.

## Gotcha #4 — OneDrive genera `desktop.ini` dentro de `supabase/migrations/` y de `.git/refs/`

Esta carpeta del proyecto vive bajo sincronización de OneDrive, que a veces deposita archivos
`desktop.ini` dentro de subcarpetas del repo —
incluyendo `.git/refs/**` (rompe `git checkout -b`/`git pull` con
`fatal: bad object refs/desktop.ini`) y `supabase/migrations/` (`supabase db push` imprime
`Skipping migration desktop.ini...`, inofensivo pero ruidoso). No están trackeados por git: si
aparecen, simplemente borrarlos con `Get-ChildItem -Recurse -Force -Filter "desktop.ini" | Remove-Item -Force`
en la carpeta afectada.

## `supabase db query` — ejecutar SQL suelto (ej. el rollback de B.4)

No existe `supabase db execute`; el comando correcto es `supabase db query --db-url <url> --file <ruta.sql>`
(o `supabase db query --db-url <url> "<sql suelto>"`, pero solo admite una sentencia por invocación —
usar `returning` si hace falta ver el resultado de un `update`/`insert` sin una segunda consulta).

## Cómo cargar la variable antes de correr cualquier `db:*`

Los scripts de `package.json` esperan `SUPABASE_DB_POOLER_URL` en el entorno del proceso — **no la
leen de `.env.local` automáticamente** (ninguna herramienta de Node en este proyecto carga `dotenv`).
Antes de correr `npm run db:push`/`db:list`/`db:dump`, en PowerShell:

```powershell
$env:PATH += ";C:\Program Files\nodejs"
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "(?m)^SUPABASE_DB_POOLER_URL=(.+)$") { $env:SUPABASE_DB_POOLER_URL = $matches[1].Trim() }
```

**No pegar la cadena de conexión (contiene la contraseña) directamente en un comando** — el harness de
Claude Code bloquea por buenas razones cualquier secreto en texto plano dentro de una línea de comando;
cargarla así desde el archivo evita que aparezca en el historial de la sesión.

## Ledger de migraciones aplicadas

| Archivo | Aplicada en (UTC) | Cómo |
| --- | --- | --- |
| `20260101000000_baseline_fase_a.sql` | — (marcada como ya aplicada, no ejecutada) | `supabase migration repair --status applied 20260101000000` — describe el esquema que ya existía en prod desde la Fase A, verificado en la Unidad 0.0 |
| `20260808233430_fase_b_profiles.sql` | 2026-08-08 | `npm run db:push` — Unidad B.2: tabla `profiles`, función `is_admin()`, policies `profiles_self_read`/`profiles_admin_all`. No toca las policies de lectura pública de `requirements`/`requirement_tasks` (eso es la Unidad B.4). |
| `20260809163803_fase_b_rls_authenticated.sql` | 2026-08-09 | `supabase db push` (vía `npx`, el script `db:push` de `package.json` no expande `%SUPABASE_DB_POOLER_URL%` en esta shell) — Unidad B.4: elimina las 3 policies públicas de lectura de `projects`/`requirements`/`requirement_tasks`, crea `read_authenticated`/`admin_insert`/`admin_update`/`admin_delete`, activa trigger `updated_at` en `requirements` y lo agrega a `requirement_tasks`. Rollback ejecutable en `supabase/rollbacks/20260809163803_fase_b_rls_authenticated.down.sql`. |
| `20260809192913_fase_c_campos_y_activity_logs.sql` | 2026-08-09 | Fase C, sección 0 — agrega `requirements.description`/`client_stakeholder`/`assignees`/`reopened_count` (con trigger de reabiertos), `requirement_tasks.assignee`/`planned_dates_confirmed`, y `activity_logs` con autor + RLS append-only. Elimina `requirements.documentation_folder_url` (sin consumidor). |
| `20260809221243_fix_autor_actividad_visible_a_viewer.sql` | 2026-08-09 | Code review de Fase C: `profiles_self_read` no dejaba ver el nombre del autor de una actividad ajena. Nueva función `nombre_autor(uuid)` (`security definer`, solo `authenticated`) para resolver el nombre sin abrir toda `profiles`. |
| `20260810100000_c1_seed_fechas_planeadas.sql` | 2026-08-10 | Unidad C1.1 — semillado one-off de `planned_start_date`/`planned_end_date` en las 164 tareas (criterio mixto horas/6 o duración fija por fase), `planned_dates_confirmed` queda en `false` (estimado, no confirmado). |
| `20260810110000_c1_rpc_actualizar_fechas.sql` | 2026-08-10 | Unidad C1.2 — RPC `rpc_set_planned_dates(jsonb)` (`security invoker`) para el guardado atómico de fechas planeadas editadas a mano desde `/planeacion/[requerimiento]/editar`. |
| `20260810120000_c1_ext_horas_por_tarea.sql` | 2026-08-10 | Extensión de alcance de C1 (fuera del diseño original de C3): `activity_logs.task_id` + `requirement_tasks.executed_hours` derivada por trigger — horas ejecutadas también a nivel de tarea, no solo de requerimiento. |
| `20260810130000_c2_1_status_tarea_check.sql` | 2026-08-10 | Unidad C2.1 — `requirement_tasks.status` pasa de texto libre a `CHECK constraint` de 6 valores canónicos (`No iniciada`/`Pendiente`/`En curso`/`Bloqueada`/`Completada`/`Cancelada`); los 165 valores reales ya coincidían, sin `UPDATE` de normalización. |
| `20260811000000_c3_fase_actividad.sql` | 2026-08-11 | Pivot intermedio de la Unidad C3 (ya superado por la fusión de abajo): agrega `activity_logs.phase_number` y default `'OTRO'` en `event_type`. |
| `20260811010000_c3_3_executed_hours_requerimiento.sql` | 2026-08-11 | Unidad C3.3 — `requirements.executed_hours` pasa de valor estático migrado del Excel a columna derivada por trigger desde `activity_logs`, con backfill de la diferencia (no duplica horas ya registradas). |
| `20260811020000_c3_fusion_tarea_actividad.sql` | 2026-08-11 | Segundo pivot en vivo de C3 (diseño final): "tarea" y "actividad" son el mismo concepto. Nueva tabla `requirement_phase_deadlines` (fecha límite por fase, independiente de las tareas). |
| `20260811030000_fix_cascade_horas_tarea_eliminada.sql` | 2026-08-11 | Hotfix: eliminar una tarea con horas registradas no bajaba el total del requerimiento. Causa raíz: `activity_logs.task_id` tenía `on delete set null` en vez de `on delete cascade`. Corregido + reparado el caso real afectado en producción. |
| `20260811040000_cierre_tecnico_pre_refinamiento.sql` | 2026-08-11 | Cierre técnico pre-refinamiento: elimina `document_versions` (scaffolding vacío de la entonces-Fase D), agrega `ON DELETE SET NULL` explícito en 2 FK, índice en `activity_logs.task_id`, trigger de `updated_at` en `requirement_phase_deadlines`, protege `executed_hours` contra `UPDATE` directo. |
| `20260811160000_fix_hallazgos_linter_supabase.sql` | 2026-08-11 | Corrige hallazgos del Database Linter de Supabase: elimina 2 tablas de respaldo one-off sin RLS (`_backup_executed_hours`, `_backup_activity_logs_horas_huerfanas`), fija `search_path` en 3 funciones, revoca `EXECUTE` de los triggers de recálculo de horas a `anon`/`authenticated`. |
| `20260811170000_drop_columnas_huerfanas.sql` | 2026-08-11 | Cierre de deuda técnica: dropea `requirements.billing_date` y `requirement_tasks.completed_date`, confirmadas sin ningún consumidor de lectura real. Tipos regenerados con `npm run types:db` en el mismo cierre. |
| `20260811220343_limpieza_not_null_horas.sql` | 2026-08-11 | Limpieza de esquema (sin cambio de comportamiento): `requirements.executed_hours` y `activity_logs.hours_spent` pasan a `NOT NULL`, igualando `requirement_tasks.executed_hours` (ya `NOT NULL`). Las 5 filas de `activity_logs` con `hours_spent` real en NULL (notas de bitácora sin horas) se normalizaron a 0 por decisión del PO antes de aplicar el constraint. Invariante `executed_hours = SUM(hours_spent)` verificado en 0 discrepancias antes y después. Tipos regenerados con `npm run types:db`. |
| `20260811220450_limpieza_indices_faltantes.sql` | 2026-08-11 | Limpieza de esquema: agrega `idx_activity_logs_created_by` e `idx_requirement_tasks_assignee`, las únicas dos columnas de tipo FK/filtro frecuente que quedaban sin índice. No cambia ningún resultado de consulta. |
