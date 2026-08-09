# Migraciones — flujo y gotchas reales (Unidad 0.1, 2026-08-07)

## Flujo normal

1. `npm run db:new <nombre>` → crea `supabase/migrations/<timestamp>_<nombre>.sql` vacío.
2. Editar el `.sql`. **Regla obligatoria: todo archivo de migración termina con un bloque comentado
   `-- ROLLBACK:` con el SQL inverso** (ver `20260101000000_baseline_fase_a.sql` como ejemplo).
3. `npm run db:push -- --dry-run` (revisar la salida línea por línea).
4. `npm run db:push` para aplicar de verdad.
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
