# Plan — Unidad B.1: Clientes SSR de Supabase + `proxy.ts` (sin tocar RLS)

> Copia en el repo del plan aprobado (originalmente en `~/.claude/plans/sprightly-jumping-snowglobe.md`)
> para que una sesión futura sin memoria de esta conversación pueda retomarlo o auditarlo.

## Contexto

El proyecto Tablero 414 (`dashboard-414`) completó la Fase 0 (Fundaciones) el 2026-08-09 y ahora
entra a la **Fase B (Supabase Auth + roles Admin/Viewer)**, diseñada en `ROADMAP_V2.md`. Fase B
modifica RLS sobre datos de producción, así que se ejecuta unidad por unidad, cada una en su propio
commit, con las más riesgosas al final.

**Esta sesión ejecuta solo la Unidad B.1**, por decisión explícita del PO: el roadmap marca como
"la incógnita mayor" si `@supabase/ssr` es realmente compatible con `proxy.ts` (la convención nueva
de Next 16.2 que reemplazó a `middleware.ts`) — casi toda la documentación de Supabase en internet
asume `middleware.ts`. B.1 es, además, la unidad más segura para probar esto: **no toca la base de
datos, no crea usuarios, no cambia RLS** — solo introduce el manejo de cookies de sesión SSR
manteniendo el comportamiento público actual idéntico. Si algo sale mal, el rollback es un simple
`git revert` sin ningún cambio de esquema que deshacer.

Una vez B.1 esté verificada (local + Vercel), se hace una pausa antes de continuar con B.2 (que sí
empieza a tocar la base de datos: tabla `profiles`, función `is_admin()`).

## Estado actual del código (verificado, no supuesto)

- `src/lib/supabase/server.ts` (20 líneas): `getSupabaseClient()` es **síncrono**, crea un
  `createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)` de `@supabase/supabase-js` con las dos
  constantes hardcodeadas (líneas 14-15) y un comentario (líneas 4-13) que justifica por qué no son
  env vars (Vercel free no soporta env vars por ambiente). **Ese comentario se conserva íntegro.**
- 3 call sites de `getSupabaseClient()`, todos síncronos hoy:
  - `src/lib/dashboard-data.ts:87`
  - `src/lib/planeacion-data.ts:33`
  - `src/lib/requerimiento-data.ts:31`
- **No existe** ningún `proxy.ts`, `middleware.ts` ni `src/middleware.ts` en el proyecto — se crea
  desde cero.
- `package.json`: Next **16.2.12**, React **19.2.4**, `@supabase/supabase-js` `^2.45.0` ya instalado.
  **`@supabase/ssr` NO está instalado** — hay que agregarlo.
- `.env.local` ya tiene `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` **sin uso actual**
  en el código (posible resto de un intento anterior). **No se usan en esta unidad**: el roadmap
  indica mover las constantes hardcodeadas a un archivo dedicado, no convertirlas a env vars — se
  mantiene la decisión documentada en `CLAUDE.md`. Si en el futuro se quiere revisar esa decisión,
  es tema aparte, no de esta unidad.
- `src/lib/supabase/` solo tiene `server.ts` y `database.types.ts` (más un `desktop.ini` de
  OneDrive, ignorable, pero indica que la carpeta del proyecto está bajo sincronización de OneDrive
  — cuidado con archivos bloqueados temporalmente al escribir).
- Docs oficiales verificadas en `node_modules/next/dist/docs/`:
  - `proxy.ts` va en `src/`, al mismo nivel que `app/` (no en la raíz del repo, porque este proyecto
    usa `src/app`).
  - Exporta una única función, `default` o nombrada `proxy`.
  - **Declarar `runtime` en `proxy.ts` lanza error** — no incluirlo bajo ninguna circunstancia.
  - `matcher` es un patrón de regex negativo recomendado para no interceptar `_next/static`,
    `_next/image`, `favicon.ico`, fuentes e imágenes.
  - `cookies()` de Server Components es de solo lectura (`.set()` no soportado ahí) — el refresco de
    la cookie de sesión debe hacerse desde el proxy, usando la API de `NextRequest`/`NextResponse`
    (no `next/headers`).

## Decisiones confirmadas con el PO (cuestionario de 20 preguntas, no volver a preguntar)

- **Sistema de diseño (claude.ai/design)**: ya existe como proyecto para Tablero 414, en progreso.
  **B.1 no depende de él** (es pura infraestructura, sin pantallas). Para las futuras Unidades B.3
  (login) y B.5 (indicador RoleGate) — **fuera de alcance de esta unidad** — la regla es: **esperar
  componentes sincronizados vía `/design-sync`, no construir con shadcn como placeholder.** Cuando se
  planifiquen esas unidades, el plan debe dejar explícito **qué se necesita del sistema de diseño**
  (qué componentes, con qué props/variantes) para que el PO lo lleve a Claude Design y lo mande
  construir allá — no es responsabilidad de esa sesión sondear el estado de ese proyecto con
  `DesignSync` por iniciativa propia.
- **`.env.local`**: `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (huérfanas, sin
  consumidor) **se borran** de `.env.local` en esta unidad — el PO sigue en el plan free de Vercel,
  así que la estrategia de constantes hardcodeadas (documentada en `CLAUDE.md`) sigue vigente y esas
  variables no tienen ningún uso futuro previsto.
- **Matcher del proxy**: usar el patrón exacto del roadmap, **sin** añadir de antemano una exclusión
  de `/api/*` (no existe ninguna ruta API hoy; se ajusta cuando exista).
- **Logging temporal**: el proxy sí deja un `console.log` mínimo cuando refresca el token — permite
  confirmar en los logs de Vercel que `@supabase/ssr` + `proxy.ts` realmente se ejecutan en
  producción (la "incógnita mayor" del roadmap). Documentar en el commit que es temporal.
- **Flujo de git — cambia a partir de esta unidad**: en vez de commitear y pushear directo a
  `origin/main` (como en toda la Fase 0), **Fase B usa rama + PR**, aunque el PO sea el único
  revisor (autoaprobación). Vercel **no tiene previews por PR** — solo despliega producción desde
  `main` — así que el único momento en que se puede verificar de verdad en Vercel es **después de
  mergear el PR**. Antes de cada `git push` (a la rama) y antes de mergear el PR a `main`, se avisa
  ("voy a hacer X") y se procede salvo objeción explícita — no hace falta mostrar el diff completo y
  esperar aprobación línea por línea.
- **Verificación de Network (DevTools)**: la hace el PO manualmente; no se automatiza con un test.
- **Test del matcher del proxy**: no se agrega; la verificación manual del roadmap es suficiente para
  esta unidad.
- **Tras el deploy a producción**: si los criterios de aceptación pasan, se continúa con B.2 sin
  tiempo de reposo adicional (en otra sesión, ya que B.2 sí necesita su propia ronda de preguntas por
  tocar la base de datos).
- **Si algo falla en producción tras el deploy de B.1**: rollback inmediato (`git revert` + push a
  `main`) sin pedir confirmación previa — reportar después de hecho, no antes.
- **Ritmo de preguntas para el resto de Fase B**: esta ronda de 20+ preguntas fue especial para B.1
  por ser la unidad de mayor incertidumbre técnica. **Para el resto de Fase B, la ronda grande se
  reserva para unidades de alto riesgo**: las que tocan BD/RLS (B.2, B.4) o las que tienen UI nueva
  (B.3, B.5). Unidades más mecánicas pueden planificarse de forma más directa.
- Sin fecha límite fija para el cierre de la Fase B completa.

## Cambios a implementar

### 0. Crear rama de trabajo
`git checkout -b fase-b/b1-clientes-ssr-proxy` (o nombre equivalente) antes de tocar nada — Fase B
usa rama + PR en vez de commitear directo sobre `master`/`main` (cambio de flujo confirmado con el
PO, ver "Decisiones confirmadas" arriba).

### 0.1. Limpiar `.env.local`
Borrar las líneas `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (huérfanas, sin
consumidor en el código, confirmado con el PO). `.env.local` no está trackeado por git, así que este
paso no genera ningún diff ni commit.

### 1. Instalar dependencias
```
npm i @supabase/ssr server-only
```
Verificar que la versión de `@supabase/ssr` instalada es de la misma línea major 2 que
`@supabase/supabase-js` (2.x).

### 2. `src/lib/supabase/config.ts` (nuevo)
Mover ahí `SUPABASE_URL`/`SUPABASE_ANON_KEY` desde `server.ts:13-14`, **conservando íntegro el
comentario** de por qué están hardcodeadas.

### 3. Reescribir `src/lib/supabase/server.ts`
- `import "server-only";` al principio (falla el build si un Client Component lo importa por error).
- `getSupabaseClient()` pasa a ser **async**.
- Usa `createServerClient<Database>` de `@supabase/ssr` con `cookies()` (async, `await cookies()`) y
  el par `getAll`/`setAll`.
- El `setAll` va envuelto en un `try/catch` vacío con el comentario exacto que pide el roadmap:
  *"Llamado desde un Server Component: `.set` no está permitido. El refresco lo cubre `src/proxy.ts`.
  No es un error."*

### 4. `src/lib/supabase/proxy-client.ts` (nuevo)
Cliente que lee cookies de `NextRequest` y las escribe en `NextResponse` (patrón estándar de
`@supabase/ssr` para middleware/proxy) — usado únicamente por `src/proxy.ts`.

**Nota de alcance**: el cliente `browser.ts` (para `createBrowserClient`) **se difiere a la Fase D**
(subida directa a Storage), tal como especifica el roadmap — no se crea en esta unidad.

### 5. `src/proxy.ts` (nuevo)
- **Solo refresca la sesión en esta unidad — no redirige a nadie todavía** (no hay `/login` ni
  usuarios; eso es B.3).
- Llama a `getUser()` a través del cliente de proxy para forzar el refresh del token si hace falta,
  y propaga las cookies actualizadas en la respuesta.
- **`console.log` temporal** al refrescar el token (p.ej. `"[proxy] sesión refrescada para", pathname`)
  — permite confirmar en los logs de Vercel que `@supabase/ssr` + `proxy.ts` corren de verdad en
  producción. Marcarlo con un comentario `// TEMPORAL: quitar tras verificar en logs de Vercel`.
- **Sin `runtime` declarado.**
- `matcher` obligatorio, patrón de exclusión negativo:
  `"/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"`

### 6. Actualizar los 3 call sites a `await`
`src/lib/dashboard-data.ts:87`, `src/lib/planeacion-data.ts:33`, `src/lib/requerimiento-data.ts:31`
→ `const supabase = await getSupabaseClient();`. Confirmar en cada archivo que la función contenedora
ya es `async` (estas funciones ya hacen `await` a las queries de Supabase, así que debería ser
automático) — si `tsc` marca algo, corregirlo ahí mismo.

## Verificación (criterios de aceptación de B.1, del roadmap)

1. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — los 4 en verde.
2. `npm run dev` local: las 3 rutas (`/`, `/planeacion`, `/requerimiento/[item]`) renderizan
   exactamente igual que antes de este cambio (mismos datos, sin banner de error).
3. DevTools → Network: los `.css`/`.js` y los 4 `.woff2` de Montserrat devuelven 200 — confirma que
   el `matcher` del proxy no los está interceptando.
4. Deploy a Vercel: como Vercel no tiene previews por PR, la verificación real en producción solo
   ocurre **después de mergear el PR a `main`**. Tras el merge, confirmar que el sitio sigue
   funcionando igual para un visitante anónimo y revisar los logs de Vercel para el `console.log`
   temporal del paso 5 — **esto es lo que responde la incógnita real**: si `@supabase/ssr` funciona
   correctamente con `proxy.ts` en producción, no solo en local.

**Flujo de git de esta unidad**: commit(s) en la rama `fase-b/b1-...` → push de la rama → abrir PR →
avisar ("voy a pushear/abrir el PR/mergear X") y proceder salvo objeción explícita (no hace falta
mostrar el diff completo y esperar aprobación línea por línea) → CI en verde en el PR → merge a
`main` → verificar en producción.

## Rollback

Si algo falla en producción tras el merge: **rollback inmediato sin pedir confirmación previa**
(`git revert` del commit de merge + push directo a `main`), reportando al PO después de hecho, no
antes. **No se tocó la base de datos** — es, según el propio roadmap, el punto de rollback más
limpio de toda la Fase B.

## Después de esta unidad

Al cerrar la unidad, actualizar `ROADMAP_V2.md` (marcar B.1 completa, con hallazgos reales) y
`CLAUDE.md` si aplica, en un commit separado del código — igual que se hizo con las Unidades 0.x.
**No continuar con B.2 sin pausa de verificación explícita**, según lo acordado con el PO.
