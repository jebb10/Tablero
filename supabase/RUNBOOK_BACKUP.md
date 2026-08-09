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
3. Restaurar `schema.sql` y luego `data.sql` contra el proyecto desechable. **Gotcha confirmado
   (2026-08-09): `supabase db query --file` falla** con `cannot insert multiple commands into a
   prepared statement` — la CLI ejecuta el archivo como *prepared statement*, que no soporta
   múltiples sentencias SQL, y ni `schema.sql` ni `data.sql` son de una sola sentencia. Tampoco hay
   `psql` instalado en esta máquina. Alternativa que funcionó: `npm install pg --no-save` (cliente
   Postgres de Node, protocolo *simple query*, sí soporta múltiples statements en un solo `.query()`)
   y un script de un solo uso que lee el `.sql` y lo ejecuta contra `RESTORE_TEST_DB_URL`. Desinstalar
   `pg` (`npm uninstall pg`) y borrar el script al terminar — no es una dependencia del proyecto.
4. Verificar conteos contra los números reales de la Unidad 0.0: **28 `requirements` / 164
   `requirement_tasks`** (no asumir 28/185 — ver 0.0).
5. Borrar el proyecto de prueba.

## Bitácora de ensayos

| Fecha (UTC) | Resultado | Notas |
| --- | --- | --- |
| 2026-08-09 | ✅ Éxito | Run `31291026258` disparado por `workflow_dispatch`. Artifact `supabase-backup-31291026258` (~23 KB) descargado y verificado: `schema.sql` (10.573 bytes) y `data.sql` (81.570 bytes) no vacíos. Restaurados contra un proyecto Supabase desechable (`tablero-restore-test`, borrado al terminar) vía `supabase db query --file` (el flag `--file` falló con múltiples statements — se usó el cliente `pg` de Node en modo simple-query como alternativa). Conteos tras restaurar: **28 `requirements` / 164 `requirement_tasks`** — coinciden exactos con los reales de la Unidad 0.0. |
