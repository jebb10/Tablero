# Runbook de backup — Unidad 0.5

## Qué se respalda

Dos dumps por corrida, vía `supabase db dump` contra el **Session Pooler** (la única cadena que
resuelve tanto en local como en GitHub Actions — ver `MIGRACIONES.md`, gotcha #2):

- `schema.sql` (`--schema public`) — detector de deriva: si no coincide con `supabase/migrations/*.sql`,
  algo se aplicó fuera del flujo de migraciones.
- `data.sql` (`--data-only`) — lo irremplazable. Contiene datos de negocio del cliente.

## Dónde vive

- **Artifacts del workflow** `.github/workflows/backup.yml`, `retention-days: 90`. **Nunca se
  commitea al repo** — `jebb10/Tablero` es público (confirmado en la Unidad 0.3); un dump en el
  historial de git sería una fuga irreversible.
- **Copia mensual manual a OneDrive** (tarea recurrente del PO, no automatizada — es la única
  protección contra la pérdida de la cuenta de GitHub, ya que los artifacts viven ahí).

## Cada cuánto

- Automático: diario, `cron: "0 7 * * *"` (02:00 America/Bogotá).
- Manual: `workflow_dispatch` desde la pestaña Actions, cuando se quiera probar sin esperar al cron.
- **Aviso operativo**: GitHub desactiva los workflows programados en repos sin push/PR por 60 días
  seguidos — si el repo queda inactivo, revisar que el cron sigue corriendo.

## Secreto requerido

`SUPABASE_DB_URL` en GitHub → Settings → Secrets and variables → Actions. Debe ser la cadena del
**Session Pooler** (la misma que `SUPABASE_DB_POOLER_URL` en `.env.local` local) — la conexión directa
es IPv6-only y los runners de GitHub Actions no tienen IPv6.

## Regla operativa clave

- Repetir el ensayo de restauración **cada trimestre y antes de cualquier migración destructiva**.
- **Antes de la migración de RLS de la Unidad B.4** (flip a solo-autenticados), ejecutar
  `npm run db:dump` localmente y guardar el archivo hasta confirmar que el flip salió bien.

## Procedimiento de restauración (probado)

1. Disparar el workflow a mano (`workflow_dispatch`) y descargar los 2 artefactos.
2. Crear un proyecto Supabase **desechable** (free permite 2 proyectos activos — confirmar que no se
   está ya en el límite antes de crear uno nuevo).
3. Restaurar `schema.sql` y luego `data.sql` contra el proyecto desechable (`psql` con la connection
   string del proyecto de prueba, o el flujo equivalente de la CLI de Supabase).
4. Verificar conteos contra los números reales de la Unidad 0.0: **28 `requirements` / 164
   `requirement_tasks`** (no asumir 28/185 — ver 0.0).
5. Borrar el proyecto de prueba.

## Bitácora de ensayos

| Fecha (UTC) | Resultado | Notas |
| --- | --- | --- |
| _pendiente_ | — | Primer ensayo pendiente de ejecutar tras crear el secreto `SUPABASE_DB_URL` en GitHub (ver instrucciones que te doy en el chat). |

**No marcar la Unidad 0.5 como verificada de punta a punta hasta que esta tabla tenga al menos una fila
real con fecha y resultado.**
