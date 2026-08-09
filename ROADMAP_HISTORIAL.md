# Historial de unidades cerradas — Tablero 414

> Este archivo existe para que `ROADMAP_V2.md` se quede liviano. Contiene el
> diseño original + la bitácora real de verificación de cada unidad **ya
> completada** (Fase 0, Fase B hasta B.3). Solo hace falta abrirlo si se
> necesita el detalle exacto de cómo se ejecutó algo ya hecho — para seguir
> trabajando en el roadmap, `ROADMAP_V2.md` (con el diseño de B.4 en
> adelante) es suficiente. Ver la tabla de estado por unidad en
> `ROADMAP_V2.md` y en `CLAUDE.md`.

---

# FASE 0 — Fundaciones

Nada de B/C/D se ejecuta sin esto. La Fase B modifica RLS sobre datos de producción; sin migraciones
versionadas ni backup probado, es un cambio irreversible sin red de seguridad.

## Unidad 0.0 — Verificación del estado real de la BD (read-only, bloqueante)

**Meta.** `supabase/schema.sql` es el único registro del esquema y **ya se desvió antes**. Confirmar
contra la BD viva antes de escribir una línea.

**Archivos.** Crear `supabase/verificacion.sql` (queries read-only; nunca se ejecuta automáticamente).

**Pasos.** El PO ejecuta en el SQL Editor y pega la salida en la sesión:
1. `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' order by table_name, ordinal_position;`
2. `select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public';`
3. `select tgname, tgrelid::regclass from pg_trigger where not tgisinternal;`
4. `select status, count(*) from requirement_tasks group by 1 order by 2 desc;` ← **bloqueante para C2.1** (el conjunto real de estados de tarea es desconocido hoy)
5. `select count(*) from requirement_tasks where planned_start_date is not null;` ← debe ser **0**
6. `select count(*) from activity_logs; select count(*) from document_versions;` ← deben ser **0**
7. `select id, name from storage.buckets;` ← debe estar vacío
8. `select code, slug from requirements order by code;` ← **se guarda como fixture** para 0.6
9. `select count(*) from requirements;` y `select count(*) from requirement_tasks;` ← números reales (no asumir 28/185)
10. `select count(*) from requirements where status='CERRADO_POR_CAMBIO_ALCANCE';` ← si >0, hoy se muestran mal

**Aceptación.** Las 10 salidas pegadas y comparadas contra `schema.sql`. Cualquier divergencia se
documenta **antes** de continuar.

**Guardarraíl obligatorio (contradicción #11).** Añadir al encabezado de
`scripts/migrate_to_supabase.py` un aviso en mayúsculas: *`--reset` borra `requirements` del proyecto
y **cascadea a `activity_logs` y `document_versions`**; desde la Fase C esas tablas contienen datos
que no existen en ninguna otra parte. NO usar `--reset`.* (Solo comentario; el script ya no es
re-ejecutable porque su `.xlsx` fuente fue borrado.)

### ✅ Unidad 0.0 completada (2026-08-07)

Las 10 queries se corrieron contra la BD real. Divergencias encontradas frente a lo que este documento
y `schema.sql` asumían:

- **Conteo real: 28 `requirements` / 164 `requirement_tasks`** (no 185 — el número "185" que circulaba
  en `CLAUDE.md`/memoria venía de la migración original y **nunca se había verificado en vivo**; no se
  investiga la diferencia porque el `.xlsx` fuente ya no existe, pero **164 es el número a usar de
  aquí en adelante** en 0.5, B.4 y C3.3, no 185).
- **Estados reales de `requirement_tasks` (bloqueante para C2.1, ya resuelto): 4 valores exhaustivos** —
  `Completada` (148), `En curso` (9), `Pendiente` (4), `No iniciada` (3). No hay un 5º estado oculto.
- Confirma contradicción **#1**: `document_versions` solo tiene `file_url` + `version` — nada de
  `is_latest`/`storage_path`/`uploaded_by`.
- Confirma contradicción **#4**: `activity_logs` no tiene columna de autor.
- Confirma contradicción **#3**: `activity_logs` y `document_versions` tienen RLS habilitado con
  **cero policies** (ni siquiera lectura pública) — hoy son ilegibles vía API aunque existan.
- Confirma contradicción **#2**: no existe ningún trigger de `updated_at` en las tablas de negocio; los
  únicos triggers no internos son de `storage.*`/`realtime.*` (infraestructura de Supabase, no tocar).
- Confirma que `milestone` ya es `text` (contradicción #5, era del baseline que se escribe en 0.1).
- Contradicción **#8** (`CERRADO_POR_CAMBIO_ALCANCE`): 0 requerimientos en ese estado hoy — el bug
  sigue latente pero no está afectando datos reales todavía.
- `planned_start_date` en 0 filas, `activity_logs`/`document_versions` en 0 filas, sin buckets de
  Storage: los tres, como se esperaba.
- Fixture de 28 `{code, slug}` guardado para el test de `slugify()` de la Unidad 0.6 — incluye 5 códigos
  con espacios/comas/paréntesis (`Accesibilidad, Portal Web`, `Wompi (FR14)...`, etc.) que son el caso
  de prueba más útil para verificar el port.

Ninguna divergencia bloquea continuar. Queries archivadas en `supabase/verificacion.sql`.

---

## Unidad 0.1 — Credenciales de BD + Supabase CLI y migraciones versionadas

**Meta.** Dejar disponible la cadena de conexión Postgres (bloqueante para migraciones **y** backups)
y el proyecto enlazado con la CLI.

**Instrucciones manuales para el PO (paso a paso):**
1. Entrar a [supabase.com/dashboard](https://supabase.com/dashboard) → proyecto `nllqrrmxwtmwwxzopzix`.
2. Menú lateral → **Project Settings** → **Database**.
3. Sección **Database password** → botón **Reset database password** → generar una nueva → **copiarla
   y guardarla en tu gestor de contraseñas** (solo se muestra una vez).
   **[VERIFICAR EN VIVO]** Resetearla no rompe la app: la app usa la API REST con la anon key, no una
   conexión Postgres directa. Confirmar que no hay otro consumidor antes de resetear.
4. En la misma página, botón **Connect** (arriba a la derecha) → copiar **dos** cadenas:
   - **Direct connection** (`db.<ref>.supabase.co:5432`) → para uso local.
   - **Session pooler** (`aws-<n>-<region>.pooler.supabase.com:5432`, usuario
     `postgres.nllqrrmxwtmwwxzopzix`) → **para GitHub Actions**.
   **[VERIFICAR EN VIVO — gotcha crítico]** El host directo es **IPv6-only** en proyectos free y los
   runners de GitHub Actions **no tienen IPv6**. El backup (0.5) fallará con timeout si usa la directa.

**Archivos.** Crear `supabase/config.toml` (lo genera `supabase init`),
`supabase/migrations/20260101000000_baseline_fase_a.sql`, `supabase/MIGRACIONES.md`.
Mover `supabase/schema.sql` → `supabase/legado/schema-fase-a.sql` con encabezado
`-- HISTÓRICO. No ejecutar. La verdad vigente son supabase/migrations/*.sql`.
Modificar `.gitignore` (`supabase/.temp/`, `supabase/.branches/`, `supabase/backups/`) y
`package.json` (scripts `db:new`, `db:push`, `db:list`, `db:dump`).

**Pasos.**
1. Descomentar y completar `SUPABASE_DB_URL` en `.env.local` (ya gitignored por `.env*`).
2. `npm i -D supabase`
3. `npx supabase login` → `npx supabase init` (responder **no** a settings de VS Code/Deno; verificar
   que no sobrescribió `schema.sql`) → `npx supabase link --project-ref nllqrrmxwtmwwxzopzix`.
4. Escribir el baseline con el contenido íntegro de `schema.sql`, **describiendo el estado ACTUAL de
   prod, no su historia**: `milestone` declarado directamente como `text` (sin el ALTER), y el seed
   idempotente (`on conflict (slug) do nothing`).
5. `npx supabase migration repair --status applied 20260101000000`
   **[VERIFICAR EN VIVO]** confirmar la sintaxis con `--help`: el nombre del flag ha cambiado entre
   versiones. `repair` solo escribe en la tabla de control, **no ejecuta SQL** contra prod.
6. `npx supabase migration list` → baseline aplicado en local y remote, sin diferencias.
7. Escribir `supabase/MIGRACIONES.md`: flujo `npm run db:new <nombre>` → editar el `.sql` →
   `npx supabase db push --dry-run` → `npm run db:push`. **Regla: todo archivo de migración termina
   con un bloque comentado `-- ROLLBACK:` con el SQL inverso.**

**Nota sobre el baseline.** `supabase db pull` requiere Docker Desktop en varias versiones. El
baseline se construye **a mano** desde `schema.sql` para no depender de eso.
**[VERIFICAR EN VIVO]** Si hay Docker en la máquina, `db pull` es un baseline mejor.

**Aceptación.** `migration list` sin diferencias; `db push --dry-run` reporta "no new migrations"; la
app en local sigue mostrando los mismos requerimientos; `git status` no muestra `.env.local` ni `.temp/`.

**Rollback.** `migration repair --status reverted`, borrar `config.toml` y `migrations/`,
`npm uninstall supabase`. Nada se ejecutó contra prod.

**Plan B (si la contraseña no se puede obtener o `link` falla).** Mantener idéntica estructura
(`supabase/migrations/<timestamp>_<nombre>.sql`) pero aplicarlos copiando/pegando en el SQL Editor,
con un ledger `| archivo | aplicado_en (UTC) | por |` en `MIGRACIONES.md`. Cuando la contraseña
aparezca, `migration repair` marca el histórico y se migra al flujo CLI sin renombrar nada.
**Bajo el Plan B la Unidad 0.5 (backup) queda BLOQUEADA** — señalarlo al PO como riesgo abierto, no
seguir en silencio.

### ✅ Unidad 0.1 completada (2026-08-07)

Contraseña obtenida (el PO la reseteó en el Dashboard), CLI instalada y sesión autenticada por token
manual del PO (login por navegador, `npx supabase login`). **No se pudo usar el flujo feliz de la
unidad**: dos hallazgos nuevos, documentados en detalle en `supabase/MIGRACIONES.md`:

- **`supabase link` está roto en la CLI 2.112.0** para este proyecto — falla siempre con
  `SchemaError` al parsear la respuesta de `GET /v1/projects/<ref>/api-keys` (bug de la CLI, no de la
  contraseña ni la red; el `GET` del proyecto en sí responde bien). Consecuencia: **nunca usar
  `--linked`** en ningún comando de la CLI aquí — todo pasa `--db-url` explícito. Los scripts
  `db:new`/`db:push`/`db:list`/`db:dump` de `package.json` ya están escritos así.
- **La conexión directa (`db.<ref>.supabase.co:5432`) no resuelve ni siquiera en local**
  (`getaddrinfo ENOTFOUND`) — el roadmap solo anticipaba que fallaría en GitHub Actions por ser
  IPv6-only. El **Session Pooler** (`SUPABASE_DB_POOLER_URL` en `.env.local`) es la única cadena que
  funciona hoy, tanto en local como (previsiblemente) en CI.

Con `--db-url` apuntando al pooler, el resto de la unidad se completó según lo diseñado: baseline
`supabase/migrations/20260101000000_baseline_fase_a.sql` escrito a mano (describe el estado real
verificado en 0.0, seed idempotente), marcado como aplicado con `migration repair` (no se ejecutó SQL
contra prod), `migration list` y `db push --dry-run` confirman que local y remoto coinciden.
`schema.sql` movido a `supabase/legado/schema-fase-a.sql` con encabezado de histórico. `typecheck` y
`lint` limpios (esta unidad no toca código de la app, solo tooling).

**Nota para 0.2**: como `--linked` no funciona, `supabase gen types --linked` probablemente falle
igual — usar `--db-url` ahí también, o reintentar `link` por si una versión más nueva de la CLI ya
arregló el bug.

---

## Unidad 0.2 — Tipos generados de la base de datos

**Meta.** Eliminar las tres definiciones duplicadas del esquema a mano
(`dashboard-data.ts:25`, `fases.ts:11`, inline en `requerimiento/[item]/page.tsx:20-29`) y las
aserciones `as` que anulan el chequeo, para que las escrituras de B/C se validen en compilación.

**Depende de:** 0.1 (necesita `--linked`).

**Pasos.**
1. `npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts`
   **[VERIFICAR EN VIVO]** PowerShell 5.1 tiende a producir UTF-16/BOM con `Out-File`. Usar el script
   de npm (corre bajo `cmd.exe`, donde `>` produce UTF-8 correcto) o verificar el encoding.
2. Script `"types:db"` en `package.json`. El archivo generado **se commitea**.
3. `createClient<Database>(...)` en `src/lib/supabase/server.ts`.
4. Reemplazar interfaces a mano por `Database["public"]["Tables"]["requirements"]["Row"]`. Para
   `fases.ts`, que describe un **subconjunto** de columnas, usar `Pick<..., "phase_number" | ...>` —
   la fila completa no encajará con el `select()`.
5. **Eliminar** todas las aserciones `as` sobre resultados de Supabase. Si al quitarlas aparece un
   error de tipo, es un bug real: investigarlo, no volver a poner el `as`.

**Aceptación.** Cero `as` sobre resultados de Supabase en `src/`; `npx tsc --noEmit` limpio; cambiar a
propósito `"code"` por `"codee"` en un `select()` produce error de tipo (prueba de que el genérico
está activo) — revertir.

**Rollback.** `git checkout -- src/`. Cambio puramente local.

### ✅ Unidad 0.2 completada (2026-08-07)

Igual que en 0.1, el flujo feliz de la unidad no funcionó tal cual y hubo que desviarse — documentado
en el propio `supabase/MIGRACIONES.md`:

- `supabase gen types typescript --db-url ...` **requiere Docker/Podman** (`LegacyContainerRuntimeNotFoundError`),
  y esta máquina no tiene ninguno instalado. Como ya se sabía que `--linked` está roto (Unidad 0.1), se
  usó la tercera vía: **`--project-id nllqrrmxwtmwwxzopzix`**, que pasa por la Management API en vez de
  introspección directa — no necesita Docker ni el `link` roto. Script `types:db` en `package.json`
  actualizado para usar `--project-id`, no `--db-url` como decía el paso 1 original.
- Sin el problema de encoding anticipado ([VERIFICAR EN VIVO] de PowerShell/UTF-16): se generó vía
  `cmd /c "... > archivo"`, UTF-8 limpio, sin BOM.
- Las tres definiciones duplicadas (`dashboard-data.ts`, `fases.ts`, inline en
  `requerimiento/[item]/page.tsx`) reemplazadas por `Pick<Database[...]["Row"], ...>`; **cero `as` sobre
  resultados de Supabase quedan en `src/`** (incluyendo unos que no estaban en el alcance original de
  esta unidad: `planeacion-data.ts` tenía 4 casts `as string` sobre filas de Supabase, cubiertos por el
  criterio de aceptación aunque el archivo no estaba en la lista de "Archivos" de arriba).
- Prueba de la aserción: `"code"` → `"codee"` en el `select()` de `dashboard-data.ts` sí produce error
  de tipo (`SelectQueryError`) — confirma que el genérico de `createClient<Database>` está activo.
  Revertido. `tsc --noEmit`, `lint` y `npm run build` limpios.

---

## Unidad 0.3 — Puerta de calidad: typecheck, Vitest y CI

**Meta.** Que un error de tipos, de lint o una regresión en la lógica pura no pueda llegar a `main`.

**Archivos.** `vitest.config.ts`, `src/lib/semaforo.test.ts`, `src/lib/kpis.test.ts`,
`src/lib/fases.test.ts`, `.github/workflows/ci.yml`, `package.json`.

**Pasos.**
1. `npm i -D vitest vite-tsconfig-paths` (**no** instalar `jsdom`/Testing Library todavía: en Fase 0
   los tests son de funciones puras, entorno `node`; los de componentes son alcance de C).
2. `vitest.config.ts` con `tsconfigPaths()`, `environment: "node"`, `include: ["src/**/*.test.ts"]`.
3. Scripts: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`.
4. Tests iniciales sobre lo que ya existe y es puro: umbrales del semáforo; `getKPIs([])` no explota y
   cuenta por estado; `getCalidadDatos` **solo** evalúa los que tienen `tieneDetalle` (regla de
   negocio ya documentada); `agruparPorFase([])` devuelve las 5 fases en orden.
5. `.github/workflows/ci.yml`: `on: push/pull_request` sobre **`main`**; `actions/checkout@v4`,
   `setup-node@v4` (node 22, cache npm), `npm ci`, `typecheck`, `lint`, `test`, `build`.
   Nota: `next lint` fue removido en 16 — el script `lint` ya es `eslint` plano, correcto.
   **[VERIFICAR EN VIVO]** que `npm run build` funciona sin conexión a Supabase (las 3 rutas son
   `force-dynamic`, no deberían consultarse en build). Si falla por red, quitar ese paso.
6. **[VERIFICAR EN VIVO]** Confirmar con el PO si el repo `jebb10/Tablero` es **público** — es
   determinante para la Unidad 0.5.

**Aceptación.** Los 5 comandos pasan en local; Actions en verde tras el push; romper un test a
propósito lo pone en rojo (revertir).

### ✅ Unidad 0.3 completada (2026-08-07)

`vitest` + `vite-tsconfig-paths` instalados. `vitest.config.mts` (extensión `.mts`, no `.ts`: evita el
warning de Vitest 4 sobre ESM cargado como CommonJS). 13 tests en 3 archivos, todos sobre lógica pura
(`semaforo.test.ts`, `kpis.test.ts`, `fases.test.ts`) — sin `jsdom`/Testing Library, como pedía el
alcance de Fase 0. `.github/workflows/ci.yml` con los 5 pasos sobre Node 22. Confirmado con la API
pública de GitHub (`api.github.com/repos/jebb10/Tablero`, sin autenticación): **el repo es público**
(`"private": false`) — resuelve el `[VERIFICAR EN VIVO]` pendiente, es determinante para la Unidad 0.5
(nunca commitear dumps de backup). Confirmado también que `npm run build` no toca Supabase: las 3
rutas salen marcadas `ƒ` (dinámicas) en la salida del build, es decir Next no las ejecuta en build
time. Las 3 pruebas de aceptación pasaron: los 5 comandos en verde, un test roto a propósito puso la
suite en rojo (revertido), y **GitHub Actions corrió en verde tras el push** (run `31210292258`,
`conclusion: success`, verificado vía API pública).

---

## Unidad 0.4 — Robustez del app-shell y limpieza era-Excel

**Meta.** Que ninguna excepción produzca pantalla en blanco, y que el vocabulario del código deje de
mentir (nombres de Excel sobre una app que lee Postgres).

**Archivos.** Crear `src/app/error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`,
`src/lib/requerimiento-data.ts`. Renombrar `archivo-bloqueado-banner.tsx` → `error-datos-banner.tsx`.
Modificar `planeacion-data.ts`, `types.ts`, `requerimiento/[item]/page.tsx`, `page.tsx`,
`planeacion/page.tsx`, `dashboard-client.tsx`.

**Pasos.**
1. Los 4 archivos de convención. **[VERIFICAR EN VIVO]** leer
   `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` antes de
   escribirlos — la firma puede diferir. `global-error.tsx` debe renderizar sus propios `<html>`/`<body>`.
2. **Paridad de try/catch en `getPlaneacionData()`**: hoy no tiene try/catch **y además ignora los
   `error` de Supabase** (desestructura solo `data`) → un fallo tumba `/planeacion` a la 500 genérica.
   Cambiar la firma a `Promise<{ requerimientos: ...[]; error: boolean }>` y renderizar el banner.
   **Decisión explícita: NO replicar la caché in-memory de `getDashboardData()`** — ya está
   documentada como poco fiable en serverless (`dashboard-data.ts:82-84`); no propagar el patrón.
3. **Extraer las queries inline** de `requerimiento/[item]/page.tsx:31-70` a
   `src/lib/requerimiento-data.ts` → `getRequerimientoDetalle(slug)`. Beneficio directo para B: un
   único punto donde inyectar el cliente autenticado. La 2ª query queda cubierta por el try/catch.
4. **Borrar `DetalleRequerimiento`** (`types.ts:66-75`, cero consumidores, campos `hoja`/`totalesTexto`
   de la era Excel).
5. **Renombrar `ArchivoBloqueadoBanner` → `ErrorDatosBanner`** y reescribir el copy: hoy dice
   *"Mostrando los últimos datos sincronizados"* — nada se sincroniza desde la Fase A. Nuevo:
   *"No se pudo consultar la base de datos." / "Mostrando la última lectura correcta."*
   También corregir `planeacion-client.tsx:34` ("Ningún requerimiento con **hoja de detalle**…").

**Aceptación.** Con la URL de Supabase temporalmente rota en local, las 3 rutas muestran banner (nunca
pantalla en blanco ni 500) — revertir la URL. `/requerimiento/no-existe` renderiza el `not-found` con
la nav. Grep de `ArchivoBloqueado`, `DetalleRequerimiento`, `hojaDetalle`, `sincroniz` → cero.

### ✅ Unidad 0.4 completada (2026-08-07)

`error.tsx`/`global-error.tsx`/`loading.tsx`/`not-found.tsx` escritos según la firma real de Next
16.2 leída en los docs locales (**`unstable_retry`, no el clásico `reset`** — añadido en v16.2.0,
`reset` sigue existiendo pero ya no es el recomendado). `getPlaneacionData()` ahora tiene paridad de
try/catch con `getDashboardData()` y devuelve `{ requerimientos, error }`; `/planeacion` muestra
`ErrorDatosBanner` igual que `/` y `/requerimiento/[item]`. Queries de
`requerimiento/[item]/page.tsx` extraídas a `src/lib/requerimiento-data.ts` →
`getRequerimientoDetalle(slug)` (nota: el bug de la 3ª query fuera de cobertura de error sigue
igual a propósito — es alcance de C2.4, no de esta unidad). `DetalleRequerimiento` borrado de
`types.ts`. `ArchivoBloqueadoBanner` → `ErrorDatosBanner`, copy reescrito, y corregido el
"hoja de detalle" de `planeacion-client.tsx`.

Las 3 pruebas de aceptación se corrieron de verdad, no solo por inspección: con `npm run dev` y la
`SUPABASE_URL` de `server.ts` temporalmente apuntada a un host inexistente, las 3 rutas devolvieron
`200` con el banner de error (nunca blanco ni 500); revertida la URL, `/requerimiento/no-existe`
devolvió el `not-found` con la nav del layout. Grep de los 4 términos de la era Excel → cero.
`typecheck`/`lint`/`test`/`build` limpios.

---

## Unidad 0.5 — Backup de Supabase

**Meta.** Que exista una copia recuperable **fuera de Supabase**, **probada al menos una vez**.

**Depende de:** 0.1 (cadena de conexión) y 0.3 (`.github/workflows/`).

**Comparación con el backup nativo.** **[VERIFICAR EN VIVO]** Dashboard → Database → Backups y anotar
literalmente lo que ofrece el plan actual. Supuesto: en **Free no hay backups descargables ni PITR**.
Aun si los hubiera, viven en la misma cuenta Supabase — no protegen contra borrado del proyecto ni
pérdida de la cuenta. **El backup propio es necesario en cualquier caso.**

**Diseño.**
- GitHub Actions programado con `supabase/setup-cli` + `supabase db dump` (no `pg_dump` suelto: evita
  el desajuste de versión cliente/servidor y la CLI ya es dependencia desde 0.1).
- **Dos dumps por corrida**: esquema (`--schema public`) y datos (`--data-only`). El de datos es lo
  irremplazable; el de esquema debería coincidir con las migraciones y sirve de **detector de deriva**.
- **Secreto**: GitHub → Settings → Secrets and variables → Actions → `SUPABASE_DB_URL` con la cadena
  del **Session Pooler** (gotcha IPv6 de 0.1). Nunca en el repo, nunca en Vercel.
- **Artefacto: `actions/upload-artifact@v4` con `retention-days: 90`. NO commitear el dump al repo** —
  contiene datos de negocio del cliente y **[VERIFICAR EN VIVO]** el repo podría ser público;
  commitearlo sería una fuga irreversible en el historial de git.
- **Retención**: 90 días en artifacts + **una copia mensual descargada a mano** por el PO a OneDrive.
  Esa copia manual es la única protección contra la pérdida de la cuenta de GitHub — va en el runbook
  como tarea recurrente, no como automatización.
- **Frecuencia**: `cron: "0 7 * * *"` (= 02:00 America/Bogotá) + `workflow_dispatch` (indispensable
  para probarlo sin esperar al cron). Aviso: **GitHub deshabilita workflows programados en repos sin
  actividad por 60 días** — anotarlo en el runbook.

**Prueba de restauración (OBLIGATORIA — un backup no probado no es un backup).**
1. Disparar el workflow a mano y descargar los artefactos.
2. Crear un proyecto Supabase **desechable** (free permite 2 activos; **[VERIFICAR EN VIVO]** si ya se
   está en el límite, alternativa local con `npx supabase start`, que sí requiere Docker).
3. Restaurar esquema y luego datos.
4. Verificar conteos contra los números reales de la Unidad 0.0 query 9.
5. Borrar el proyecto de prueba.

**Archivos.** `.github/workflows/backup.yml`, `supabase/RUNBOOK_BACKUP.md` (qué se respalda, dónde,
cada cuánto, procedimiento de restauración **ya validado**, y **fecha del último ensayo**).

**Regla operativa clave.** Repetir el ensayo **cada trimestre y antes de cualquier migración
destructiva**. Y: **antes de la migración de RLS de B.4, ejecutar `npm run db:dump` localmente** y
guardar el archivo hasta confirmar que el flip salió bien.

**Aceptación.** El workflow produce dos artefactos no vacíos; se restauró en destino limpio con
conteos coincidentes; el runbook existe con fecha de ensayo; grep de la contraseña en el repo → cero.

### ✅ Unidad 0.5 completada (2026-08-09)

`.github/workflows/backup.yml` (cron diario 02:00 America/Bogotá + `workflow_dispatch`, dos dumps
`schema.sql`/`data.sql` vía `supabase/setup-cli@v1`, artifact con `retention-days: 90`) y
`supabase/RUNBOOK_BACKUP.md` escritos. `.gitignore` actualizado para nunca commitear `schema.sql`/
`data.sql` si se generan en local por error. Secreto `SUPABASE_DB_URL` creado por el PO en GitHub
(Session Pooler, mismo valor que `SUPABASE_DB_POOLER_URL` local).

**Prueba de restauración ejecutada de punta a punta** (ver bitácora completa en
`RUNBOOK_BACKUP.md`): workflow disparado (run `31291026258`), artifact descargado y verificado no
vacío, restaurado contra un proyecto Supabase desechable (`tablero-restore-test`, borrado al
terminar) — conteos tras restaurar **28 `requirements` / 164 `requirement_tasks`**, coinciden exactos
con los reales de la Unidad 0.0. Gotcha nuevo documentado: `supabase db query --file` no soporta
múltiples statements por archivo; se usó el cliente `pg` de Node (`npm install pg --no-save`, protocolo
simple-query) como alternativa, desinstalado al terminar. Sin Docker Desktop en esta máquina → la
prueba usó un proyecto desechable, no `supabase start` local, como ya anticipaba el riesgo #3 de la
tabla de supuestos.

---

## Unidad 0.6 — Andamiaje compartido (slug, estados, fechas, fases)

**Meta.** Piezas que B/C/D dan por sentadas. Resuelve las contradicciones #8 y #13 y la duplicación de
`FASES_ORDEN`.

**Archivos.** Crear `src/lib/slug.ts`, `src/lib/estados.ts`, `src/lib/fechas.ts`,
`src/lib/fases-orden.ts`, `src/lib/__tests__/slug.fixtures.json`, `src/lib/__tests__/slug.test.ts`.
Modificar `types.ts`, `dashboard-data.ts`, `kpis.ts`, `fases.ts`, `planeacion-data.ts`,
`dashboard-client.tsx`, `pdf-report.tsx`. Añadir `zod` como dependencia.

**Pasos.**

1. **`src/lib/slug.ts`** — port TS del `slugify()` de `migrate_to_supabase.py:96-101`:
   ```ts
   export function slugify(s: string): string {
     return s.toLowerCase().normalize("NFD")
       .replace(/[̀-ͯ]/g, "")
       .replace(/[^a-z0-9]+/g, "-")
       .replace(/^-+|-+$/g, "");
   }
   ```
   El orden importa: `toLowerCase()` **antes** de `normalize("NFD")`, igual que el Python.
   **La garantía de que coincide con los slugs almacenados es el punto crítico, no el código:** la
   salida de la Unidad 0.0 query 8 se guarda tal cual como `slug.fixtures.json` (array de
   `{code, slug}` de todos los requerimientos reales) y el test itera y asserta
   `slugify(code) === slug`. **Si un caso falla, se corrige el port, no el fixture.** Sin este test el
   port no está terminado.

2. **`src/lib/estados.ts`** — fuente única, con el mapa inverso que hoy no existe:
   `ESTADOS_DB` (`as const`, los 5 valores), `ESTADO_DB_A_ES` (`Record<EstadoDb, Estado>`, exhaustivo)
   y `ESTADO_ES_A_DB` derivado. Añadir `"Cerrado por cambio de alcance"` al tipo `Estado`.
   - Al ser `Record<Estado, number>`, **el compilador marcará** `kpis.ts:4-9` — completarlo.
   - `dashboard-client.tsx:22-31` (`BLOQUES`) es un array literal, **no falla la compilación**: hay
     que añadirlo a mano. **Recomendación (menor riesgo visual): una sección colapsable "Cerrados por
     cambio de alcance (N)" debajo de los 4 bloques**, no un 5º bloque de igual jerarquía. Revisar
     también `pdf-report.tsx`.
   - Borrar `ESTADO_DB_A_ES` de `dashboard-data.ts:12-17`. El `?? "No iniciado"` de la línea 50 pasa a
     un fallback que además hace `console.warn`: a partir de aquí un estado desconocido es un bug.

3. **`src/lib/fechas.ts`** — `ZONA = "America/Bogota"`, `hoyLocal()`, `aISO(d)` (`YYYY-MM-DD` sin
   desplazamiento de zona), `desdeISO(s)`, `sumarDias`, `diffDias`. **Motivo:** Vercel corre en UTC;
   `new Date()` en un Server Component puede dar un día distinto al del PO (UTC-5) — esto ya afecta
   hoy a `calcularSemaforo`. Todo `new Date(row.due_date)` pasa por `desdeISO`.

4. **`src/lib/fases-orden.ts`** — mover ahí el `FASES_ORDEN` duplicado y borrar las dos copias.

5. **`zod` como validador (decisión firme).** C/D introducen ~20 campos entre 3 entidades con
   coerción de fechas, decimales, enums y opcionales-vs-vacíos: exactamente donde viven los bugs de
   `FormData` (todo llega como `string`, `""` no es `null`). `z.coerce`, `.nullish()` y
   `safeParse().error.flatten().fieldErrors` encajan literalmente con la forma de estado que consume
   `useActionState`. Vive solo en el servidor (los formularios son `<form action>`), no engorda el
   bundle. **No** añadir `react-hook-form` ni el componente `form` de shadcn (que lo asume).

**Aceptación.** `npm run test` pasa con el fixture completo de slugs; typecheck y lint limpios; el
dashboard renderiza igual salvo la nueva sección de cerrados (hoy vacía).
**[VERIFICAR EN VIVO]** Si la query 10 de 0.0 devolvió >0, esos requerimientos hoy se muestran como
"No iniciado" y la corrección **cambia los conteos de los KPIs** — avisar al PO antes de desplegar.

### ✅ Unidad 0.6 completada (2026-08-08)

`src/lib/fases-orden.ts` deduplica el `FASES_ORDEN` que vivía repetido en `fases.ts` y
`planeacion-data.ts`. `src/lib/slug.ts` porta `slugify()` de `migrate_to_supabase.py` (mismo orden:
`toLowerCase()` antes de `normalize("NFD")`); el fixture `slug.fixtures.json` **no existía en disco**
pese a lo que decía la nota de la Unidad 0.0 — en vez de pedirle al PO la query manual en el SQL
Editor, se generó con un script Node de un solo uso (`@supabase/supabase-js` + `SUPABASE_SECRET_KEY`
local, nunca commiteado) contra la BD real: **28 filas**, coincide con el conteo de 0.0. Los 28 casos
del `slug.test.ts` pasan, incluyendo los 5 códigos con espacios/comas/paréntesis que motivaron el test.
`src/lib/estados.ts` es ahora la fuente única (`ESTADOS_DB`, `ESTADO_DB_A_ES` exhaustivo con los 5
valores incluyendo `CERRADO_POR_CAMBIO_ALCANCE`, `ESTADO_ES_A_DB` derivado, `dbAEstado()` con
`console.warn` en vez de fallback silencioso). `types.ts` gana el 5º valor de `Estado`; `kpis.ts`
completado (el compilador lo marcó, como anticipaba el roadmap); `dashboard-data.ts` importa
`dbAEstado()` en vez de mantener su propio `Record` de 4 claves. `dashboard-client.tsx` añadió una
sección colapsable "Cerrados por cambio de alcance" debajo de los 4 bloques (colapsada por defecto,
patrón igual al de `DataQualityPanel`); `pdf-report.tsx` añadió el 5º bloque a su tabla plana.
`src/lib/fechas.ts` creado sin consumidores todavía (queda listo para C1.4, como decía el diseño —
**no se tocó `semaforo.ts`**, cambiar su default es alcance explícito de esa unidad, no de esta).
`zod` instalado como dependencia. **0 requerimientos reales en `CERRADO_POR_CAMBIO_ALCANCE` hoy**
(confirmado en 0.0) → la sección nueva queda vacía/oculta, sin cambio visible para el PO.
`typecheck`/`lint`/`build` limpios; `npm run test`: 41/41 en verde. Verificado en vivo con `npm run dev`
(gotcha ya conocido de Turbopack reapareció — `Failed to open database`/`invalid digit found in
string`; se resolvió igual que antes borrando `.next/`): las 3 rutas devuelven 200 sin banner de error,
y la sección de cerrados no aparece en el HTML (0 casos).

---

# FASE B — Supabase Auth + roles Admin/Viewer (unidades B.1–B.3)

## Unidad B.1 — Clientes SSR + `proxy.ts` (sin tocar RLS)

**Meta.** Que la app maneje cookies de sesión y refresque tokens, funcionando **exactamente igual que
hoy** porque todavía no hay usuarios ni RLS restrictiva. Aísla la parte más frágil (compatibilidad
`@supabase/ssr` + `proxy.ts` de Next 16) en un cambio reversible sin tocar la BD.

**Estructura de tres clientes:**

| Cliente | Archivo | Uso |
|---|---|---|
| **server** | `src/lib/supabase/server.ts` — `createServerClient` + `cookies()` async | Server Components, Server Actions, todos los data-loaders |
| **proxy** | `src/lib/supabase/proxy-client.ts` — lee de `NextRequest`, escribe en `NextResponse` | Solo `src/proxy.ts`, para refrescar el token |
| **browser** | `src/lib/supabase/client.ts` — `createBrowserClient` | **DIFERIDO — no crear en B.** El login se resuelve entero con una Server Action. Se crea en la Fase D, que sí lo necesita para la subida directa a Storage. |

**Pasos.**
1. `npm i @supabase/ssr server-only`. **[VERIFICAR EN VIVO]** anotar la versión instalada y confirmar
   que es de la misma línea major 2 que `@supabase/supabase-js` 2.112.2.
2. `src/lib/supabase/config.ts`: mover `SUPABASE_URL`/`SUPABASE_ANON_KEY` desde `server.ts:13-14`
   **conservando íntegro el comentario** que explica por qué están hardcodeadas (`server.ts:3-12`).
3. Reescribir `server.ts` con `import "server-only"` (garantiza fallo en build si un Client Component
   lo importa), `const cookieStore = await cookies()` y el par `getAll`/`setAll`, con el `setAll`
   envuelto en `try/catch` vacío y un comentario: *"Llamado desde un Server Component: `.set` no está
   permitido. El refresco lo cubre `src/proxy.ts`. No es un error."* — esta es la restricción exacta
   documentada en los docs de `cookies()` de Next 16.
4. `getSupabaseClient()` pasa a ser **async**: actualizar los 3 call sites a `await`. `tsc` los encuentra.
5. **`src/proxy.ts`** — en esta unidad **solo refresca la sesión, no redirige a nadie**. Puntos
   verificados en los docs que **no** deben cambiarse:
   - El archivo va en **`src/`, al mismo nivel que `app/`** (no en la raíz del repo). `middleware.ts`
     está **deprecado y renombrado** en v16. Exporta una sola función, `default` o llamada `proxy`.
   - **NO declarar `runtime`.** En proxy el runtime es siempre Node.js y **no es configurable**;
     declararlo **lanza error**. Toda guía de Supabase que ponga `runtime: 'edge'` está desactualizada aquí.
   - El `matcher` es **obligatorio** y con valores constantes literales: sin él el proxy corre sobre
     `_next/static` y `public/fonts/`, y puede bloquear CSS/JS/tipografías.
     `"/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"`.

**Aceptación.** Typecheck/lint/test/build en verde; las 3 rutas renderizan igual; en DevTools → Network
los CSS/JS y los 4 `.woff2` de Montserrat devuelven 200 (prueba de que el matcher no los intercepta);
deploy a Vercel y el sitio sigue funcionando para un visitante anónimo.

**Rollback.** Revert + redeploy. **No se tocó la base de datos** — el punto de rollback más limpio de
toda la fase.

### ✅ Unidad B.1 completada (2026-08-09)

Ejecutada según el diseño, con la estructura de tres clientes (`server`, `proxy`; `browser` diferido a
Fase D como estaba previsto). Hallazgos reales frente a los `[VERIFICAR EN VIVO]` de arriba:

- **`@supabase/ssr` instalado en `^0.12.4`** — **no comparte numeración major con `@supabase/supabase-js`
  (2.x)**. Esto es normal: `@supabase/ssr` versiona de forma independiente en su propia línea 0.x: no
  es una incompatibilidad, el supuesto de "misma línea major 2" de este documento era incorrecto.
- **Confirmado en producción**: `@supabase/ssr` **sí es compatible con `proxy.ts`** de Next 16.2 — la
  "incógnita mayor" de la Fase B queda resuelta. `npm run build` local mostró `ƒ Proxy (Middleware)` en
  la tabla de rutas, y en `npm run dev` cada request logueó `[proxy] sesión refrescada para <ruta> user:
  anon` con tiempos de ejecución del proxy visibles (`proxy.ts: 1160ms` en frío, `13-37ms` en caliente).
- **El `matcher` exacto del roadmap funciona sin ajustes**: verificado con requests directos (no solo
  inspección visual) — `/_next/static/chunks/*.css` y las 4 fuentes Montserrat (que `next/font/local`
  emite bajo `/_next/static/media/*.woff2`, no bajo `/fonts/` literal) devuelven 200 **sin** generar log
  del proxy, confirmando que la exclusión de `_next/static` ya cubre las fuentes aunque nunca coincidan
  con el segmento `fonts/` del patrón.
- **Gotcha de Turbopack ya conocido reapareció** (`Failed to open database` / `invalid digit found in
  string` al primer `npm run dev` tras instalar dependencias nuevas) — se resolvió igual que antes,
  borrando `.next/`.
- **Nuevo gotcha de infraestructura, no anticipado por el roadmap**: como el repo completo (incluida la
  carpeta `.git`) vive bajo una carpeta sincronizada por OneDrive, OneDrive coloca archivos
  `desktop.ini` (metadata de personalización de carpetas de Windows, contenido inofensivo) dentro de
  `.git/refs/**`. Esto rompió `git fetch`/`git pull` con `fatal: bad object refs/desktop.ini` al
  intentar verificar el merge del PR. **Solución**: borrar esos `desktop.ini` con
  `Get-ChildItem .git\refs -Recurse -Force -Filter "desktop.ini" | Remove-Item -Force` y reintentar —
  las referencias reales nunca se corrompieron, solo los archivos espurios de OneDrive. Puede volver a
  aparecer en sesiones futuras; no indica un problema real del repo.
- **Log temporal retirado**: `src/proxy.ts` traía un `console.log` marcado `// TEMPORAL: quitar tras
  verificar en logs de Vercel` — retirado en un commit de limpieza posterior (`f373bc5`) una vez el PO
  confirmó haberlo visto en los logs de Vercel de producción.
- **Cambio de flujo de git confirmado con el PO para el resto de la Fase B**: a partir de esta unidad
  se usa rama + PR (autoaprobado por el PO, único revisor) en vez de push directo a `origin/main` como
  en toda la Fase 0. Esta unidad se ejecutó en la rama `fase-b/b1-clientes-ssr-proxy`, PR #1, mergeada a
  `main` (commit `6a4fd61`). Vercel no tiene previews por PR — la verificación real en producción solo
  ocurre después del merge.
- **Limpieza adicional de alcance acordado con el PO**: `.env.local` perdió las variables
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (huérfanas, sin consumidor desde que la
  Fase A hardcodeó esas constantes en código) — no afecta a esta unidad, se mantiene la estrategia de
  constantes hardcodeadas documentada en `CLAUDE.md`.
- `typecheck`/`lint`/`test` (41/41)/`build` limpios. Plan detallado de esta unidad (incluyendo el
  cuestionario de 20 preguntas al PO) se archivó originalmente en `PLAN_B1.md`; ese archivo fue
  eliminado el 2026-08-09 por redundante (todo su contenido relevante ya vive aquí).

---

## Unidad B.2 — `profiles` + `is_admin()` + creación de usuarios (sin tocar las policies existentes)

**Meta.** Que existan la tabla de roles, la función de rol y los usuarios reales, **sin** alterar aún
el acceso público. Invisible para el sitio actual.

**DDL** (migración `<ts>_fase_b_profiles.sql`):
```sql
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','viewer')),
  full_name  text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- IMPORTANTE: NO usar "force row level security" (ver nota de recursión).

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles p
                 where p.user_id = auth.uid() and p.role = 'admin');
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

create policy "profiles_self_read" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- ROLLBACK: drop policy ...; drop function public.is_admin(); drop table public.profiles;
```

**Nota sobre recursión infinita (error clásico).** `is_admin()` consulta `profiles`, y una policy de
`profiles` llama a `is_admin()`. **No** recursa porque la función es `security definer` y su dueño
(`postgres`) es también dueño de la tabla, y RLS no aplica al dueño salvo `force row level security`.
Por eso la instrucción de no declararlo. **[VERIFICAR EN VIVO]** tras aplicar, ejecutar
`select public.is_admin();` autenticado como Viewer y como Admin; si aparece
`stack depth limit exceeded`, el supuesto falló → reescribir esas dos policies sin llamar a
`is_admin()` (lectura por `user_id = auth.uid()`, sin escritura desde la API).

**Bootstrap del primer Admin — recomendación: script commiteado, no solo runbook.** El precedente del
repo (`scripts/migrate_to_supabase.py`) es un script admin-run que lee su clave de entorno, y
funcionó. Además crear usuarios **no es un evento único** (cada Viewer nuevo lo repite), y hacerlo a
mano deja fácilmente un usuario en `auth.users` **sin fila en `profiles`** — puede loguearse pero no
tiene rol: un estado roto y difícil de diagnosticar.

`scripts/create_user.mjs` (Node, sin dependencias nuevas): lee `SUPABASE_SECRET_KEY` de entorno y
**aborta si no está**; args `--email --role admin|viewer --name --password`;
`auth.admin.createUser({ email_confirm: true })` (evita depender del SMTP compartido de Supabase, que
es rate-limited); luego `upsert` en `profiles`. **Idempotente**: si el email existe, actualiza el rol.

**Pasos manuales en el Dashboard (no automatizables por migración) [VERIFICAR EN VIVO]:**
1. Authentication → Sign In / Providers → Email → **desactivar "Allow new users to sign up"**.
   **Obligatorio, no opcional**: sin esto cualquiera se auto-registra y, con `to authenticated` en las
   policies de B.4, **vería los datos**.
2. Confirmar que no hay otros providers habilitados.
3. Authentication → URL Configuration → Site URL = `https://tablero-pi.vercel.app`.

**Pasos.** `npm run db:dump` local (red de seguridad) → `npm run db:new` + pegar DDL →
`db push --dry-run` → `db push` → pasos manuales → crear 1 Admin (el PO) + 1 Viewer de prueba →
verificar en SQL Editor que ambos tienen fila en `profiles` → `npm run types:db` y commitear.

**Aceptación.** Migración aplicada; exactamente 2 usuarios, ambos con perfil; **el sitio público sigue
funcionando igual para anónimos** (aún no se tocó RLS); el signup público falla; grep de `sb_secret_`
en el repo → cero.

### ✅ Unidad B.2 completada (2026-08-08)

Ejecutada según el diseño, sin desviaciones del DDL propuesto.

- **`npm run db:dump` local falló por un gotcha nuevo**: el comando `supabase db dump` requiere Docker
  Desktop en esta máquina (no instalado) — a diferencia de `db push`/`db list`, que sí funcionan solo
  con `--db-url`. Como red de seguridad alternativa se disparó manualmente el workflow `backup.yml`
  (`workflow_dispatch`) desde la pestaña Actions y se confirmó en verde antes de aplicar la migración.
  Si se necesita un dump local en el futuro, instalar Docker Desktop primero.
- Migración `20260808233430_fase_b_profiles.sql` aplicada sin cambios sobre el DDL de esta sección;
  `db push --dry-run` y `db push` limpios, `db list` confirma local=remoto.
- **Verificado en vivo (no solo con la secret key)**: `select public.is_admin()` autenticado por
  contraseña vía `@supabase/supabase-js` con la `anon`/`publishable` key devolvió `true` para el Admin y
  `false` para el Viewer — sin `stack depth limit exceeded`. El supuesto de no-recursión de `security
  definer` se confirmó tal como estaba previsto.
- `scripts/create_user.mjs` creado según el diseño (Admin API + upsert en `profiles`, idempotente por
  email). Se usó para crear exactamente 2 usuarios: 1 Admin (`johan.benitez@linktic.com`) y 1 Viewer de
  prueba (`johan414@yopmail.com`) — confirmados con fila en `profiles` vía consulta directa.
- Pasos manuales del Dashboard (desactivar signup público, confirmar providers, Site URL) realizados
  por el PO — no verificables desde código, confirmados por el PO.
- `npm run types:db` regenerado (incluye `profiles`). `typecheck`/`lint` limpios.
- Ejecutada en la rama `fase-b/b2-profiles` (separada de `fase-b/design-auth-assets`, que solo trae
  assets/tokens del sistema de diseño y no depende de esta unidad).

---

## Unidad B.3 — `/login`, logout, helpers de sesión y layout con sesión

**Meta.** Que se pueda iniciar y cerrar sesión y que el proxy exija sesión — **con RLS todavía en modo
público**, de forma que si algo sale mal los datos siguen llegando.

**`src/lib/auth/session.ts`:**
- `getCurrentProfile()` envuelto en `cache()` de React (deduplica la llamada dentro del mismo request:
  layout + página + `RoleGate` consultan una sola vez).
- Usa **`auth.getUser()`**, nunca `getSession()`.
- **Un usuario sin fila en `profiles` devuelve `null`** = sin rol = no autorizado.
- `requireAuth()` → `redirect("/login")`; `requireAdmin()` → `redirect("/")` si el rol es viewer.

**Login.**
- `src/app/login/page.tsx` (Server Component): si ya hay perfil, `redirect("/")`.
  **[VERIFICAR EN VIVO]** en Next 16 `searchParams` **también es una `Promise`** y hay que `await`,
  igual que el `params` de `requerimiento/[item]/page.tsx:15-17`.
- `src/components/auth/login-form.tsx` (`"use client"`): `useActionState(loginAction, {error: null})`
  — el tercer elemento da el `pending` sin `useFormStatus`. Reusa `Input`/`Button` de `ui/`.
- `src/app/login/actions.ts`: firma `(prevState, formData)`; validación mínima a mano (**no** meter
  zod aquí todavía); `signInWithPassword`; error genérico; `redirect(next ?? "/")`.
  **`redirect()` lanza una excepción de control: debe quedar FUERA de cualquier `try/catch`**, o el
  catch se la come y el login parecerá fallar.
  Al setear la cookie, Next re-renderiza en el mismo roundtrip — **no hace falta `refresh()` extra**.
- Logout: `cerrarSesion()` → `signOut()` → `redirect("/login")`, invocado desde un
  `<form action={cerrarSesion}>` en el layout (no un `onClick`).

**`src/app/layout.tsx`** pasa a `async`. Renderiza la nav **solo si hay perfil**, con email, badge de
rol y botón de cerrar sesión. En `/login` no hay perfil → no hay nav, que es lo deseado, sin necesidad
de route groups. Mantener `print:hidden`.

**`src/proxy.ts` (ampliación).** Tras `getUser()`: si no hay usuario y el pathname no es `/login`,
`NextResponse.redirect(new URL("/login?next=" + pathname, request.url))`.
**Gotcha crítico:** hay que **copiar las cookies que el cliente Supabase escribió en `response` sobre
la respuesta de redirección**, o el token refrescado se pierde y se produce un bucle
(`ERR_TOO_MANY_REDIRECTS`). Es el bug número uno de este patrón.

**Aceptación.** Anónimo en producción → 307 a `/login`, que carga con estilos y tipografías (200);
login Admin y Viewer funcionan y ambos ven los datos; credenciales malas → mensaje genérico sin
excepción en consola; logout limpia la cookie; sin bucle de redirección.

**Rollback.** Revert + redeploy → el sitio vuelve a ser público. **La BD no se tocó en esta unidad —
es el último punto en que eso es cierto.**

### ✅ Unidad B.3 completada (2026-08-09)

Ejecutada con **alcance ampliado respecto al diseño original de esta sección**: además de
login/logout/helpers de sesión, se agregó todo el flujo de recuperar/restablecer contraseña
(`src/app/login/recuperar/*`, `src/app/login/restablecer/*`, `src/app/auth/callback/route.ts`), no
contemplado arriba — decisión tomada con el PO vía cuestionario el mismo día (ver commits `9925f49`,
`353d589`, `f10e31c`, `afdedc9`, `d445ae6`).

- Los 4 `[VERIFICAR EN VIVO]` de esta unidad se confirmaron correctos: `searchParams` es `Promise` en
  Next 16 (confirmado en `login/page.tsx`); el gotcha de cookies en la redirección del proxy se manejó
  copiando la respuesta del cliente Supabase sobre la de redirección, sin bucle; `redirect()` se dejó
  fuera de cualquier `try/catch` en las 3 Server Actions de auth.
- Checklist de aceptación verificado en vivo por el PO: login Admin y Viewer, logout, protección de
  rutas por `src/proxy.ts`, manejo de link expirado — todo correcto.
- **Dos pendientes operativos, no resueltos**: (1) el servicio de correo por defecto de Supabase (sin
  SMTP propio) tiene un límite de envíos muy bajo, pensado solo para pruebas, que se agotó durante la
  verificación manual — **no se pudo confirmar en vivo el último tramo del flujo de recuperar
  contraseña** (aterrizar en `/login/restablecer` y definir la nueva contraseña); (2) falta agregar
  `https://tablero-pi.vercel.app/auth/callback` a las Redirect URLs de Supabase (hoy solo está
  whitelisteado `localhost`). Ninguno de los dos se resolvió en esta sesión de limpieza documental
  (2026-08-09) — quedan como pendientes explícitos en `CLAUDE.md`.
- **Nuevo pendiente señalado por el PO (2026-08-09, sesión de limpieza documental)**: el flujo de
  recuperar contraseña tampoco ha sido probado manualmente por él todavía, más allá del límite de SMTP
  ya documentado.
- shadcn/ui (Base UI) + tokens del sistema de diseño de Claude Design ya sincronizados (`design/*.dc.html`,
  tokens en `globals.css`) usados en `login-form.tsx`/`recuperar-form.tsx`/`restablecer-form.tsx`/
  `role-badge.tsx` — confirmado con el PO que esto **cumple** la regla de "no shadcn genérico como
  placeholder mientras se espera el sistema de diseño": una vez llegan los tokens reales, shadcn + esos
  tokens **es** la implementación válida, no un placeholder.
- Ejecutada en la rama `fase-b/b3-login-sesion`, PR #6, mergeada a `main` (commit `0b4fb6f`, 2026-08-09).
- **Verificación re-corrida el 2026-08-09** (sesión de limpieza documental, no se tocó código):
  `typecheck`, `lint`, `test` (41/41) y `build` limpios sobre `main` post-merge.

Siguiente paso: Unidad B.4 (flip de RLS) — diseño completo en `ROADMAP_V2.md`, pospuesta
explícitamente por el PO el 2026-08-09 hasta una sesión futura dedicada. Decisiones de diseño ya
fijadas para cuando se retome: ver la sección "Decisiones de la Unidad B.4" en `ROADMAP_V2.md`/
`CLAUDE.md`.
