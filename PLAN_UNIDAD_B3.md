# Plan — Unidad B.3: `/login`, logout, recuperar contraseña, helpers de sesión

**Proyecto:** `dashboard-414` (Positiva Web 414), en
`C:\Users\Usuario 1\Documents\Tablero Requerimientos\dashboard-414`.
**Rama:** `fase-b/b3-login-sesion` (rama + PR autoaprobado por el PO, patrón
vigente desde B.1).
**Próximo paso al retomar esta unidad en otra sesión:** copiar este archivo
a `dashboard-414/PLAN_UNIDAD_B3.md` como primer paso de ejecución (no se
pudo hacer durante plan mode, que solo permite editar este archivo), y
luego seguir la secuencia de la sección "Orden de implementación" abajo.

## Context

El roadmap `ROADMAP_V2.md` (Unidad B.3, líneas 774-816) ya diseñó la base
de esta unidad: página de login, logout, `session.ts`, ampliación de
`proxy.ts` y layout con sesión — **con RLS todavía en modo público**, para
que un fallo en el login no tumbe el dashboard. Fase B ya completó B.1
(clientes SSR + proxy sin redirigir) y B.2 (tabla `profiles` + `is_admin()`
+ 2 usuarios reales: 1 admin, 1 viewer).

Desde que se escribió el roadmap, el PO trajo el sistema de diseño real
para esta unidad (`design/auth-dashboard-414.dc.html` +
`design-system-auth.dc.html`, ya sincronizados, tokens en `globals.css`).
Ese diseño resultó **más amplio que lo que el roadmap especificaba**: define
3 estados de banner en `/login` (no solo el de credenciales inválidas) y un
flujo completo de "¿Olvidaste tu contraseña?" que el roadmap no mencionaba
en absoluto. Un cuestionario con el PO (2026-08-09) resolvió ampliar el
alcance de B.3 para cubrir el diseño completo en vez de solo lo que decía
el roadmap original, más una pieza que el diseño tampoco cubría (la
pantalla de "definir nueva contraseña" tras clickear el link del correo,
sin la cual el flujo de recuperación queda roto a medias).

**Objetivo de esta unidad:** que se pueda iniciar sesión, cerrar sesión, y
recuperar una contraseña olvidada — con el proxy exigiendo sesión en todas
las rutas salvo las de auth — sin tocar RLS todavía (sigue en modo
público; si algo sale mal, los datos siguen siendo legibles).

## Decisiones tomadas (cuestionario 2026-08-09, no reabrir sin motivo)

1. **Recuperar contraseña SÍ entra en el alcance de B.3**, flujo completo
   de punta a punta (solicitud → email → definir nueva contraseña).
2. **Las 3 variantes de banner en `/login`** (expirado/warning, error de
   credenciales/destructive, sesión cerrada/success) se implementan todas,
   no solo la de error.
3. **`src/app/layout.tsx` se queda simple y async**, tal como decía el
   roadmap — se descartó envolver la sección de nav en `<Suspense>` pese a
   que la doc oficial de Next lo recomienda para no bloquear el streaming;
   proyecto chico, la simplicidad gana.
4. **Se crean 3 piezas nuevas de UI** que el diseño requiere y que no
   existen hoy en `src/components/ui/`: `alert.tsx`, `label.tsx`, y un
   `spinner.tsx` (envoltorio delgado de `Loader2` de `lucide-react`, ya
   instalado en el proyecto).
5. **`--primary-hover`/`--primary-disabled` se mapean a `@theme inline`**
   en `globals.css` y `buttonVariants` (variante `default`) pasa a usarlos
   en vez del `hover:bg-primary/80` genérico actual — cambio de alcance
   global sobre el botón, aceptado explícitamente por el PO.
6. **Las Server Actions de login/logout/recuperar reusan
   `getSupabaseClient()`** de `src/lib/supabase/server.ts` (no se crea un
   cliente separado) — el `try/catch` mudo alrededor de `cookies().setAll()`
   no debería activarse en el contexto de una Server Action (a diferencia
   de un Server Component puro), donde sí está permitido mutar cookies.
7. **La protección de rutas vive en `src/proxy.ts`** (protección
   optimista, todas las rutas a la vez), no como `requireAuth()` repetido
   en cada página.
8. **Query params de `/login`:** `?next=<path>` (redirección post-login,
   ya estaba en el roadmap) + `?msg=expired|logged-out` (nuevo, para los
   banners warning/success). El error de credenciales inválidas **no** usa
   query param — vive en el estado de `useActionState`, no en la URL.
9. **Detección de "sesión expirada" vs "nunca hubo sesión":** en
   `proxy.ts`, antes de llamar `getUser()`, se revisa si ya existía alguna
   cookie de Supabase (`sb-*-auth-token` / patrón `sb-`) en la request. Si
   había cookie y `getUser()` igual falla → había sesión que ya no es
   válida → redirect con `msg=expired`. Si no había cookie → primera
   visita → redirect sin `msg`.
10. **Se construye también la pantalla de "nueva contraseña"**
    (`src/app/login/restablecer/page.tsx`), sin diseño de referencia
    específico — se arma con los mismos átomos ya sincronizados (`Card`,
    `Input`, `Label`, `Button`, tokens de color) para que el flujo de
    recuperación quede completo y no rompa a medio camino.

## Estado actual verificado (no volver a explorar, ya confirmado en código)

- `src/proxy.ts` (22 líneas): hoy solo llama
  `createProxyClient(request)` → `supabase.auth.getUser()` → devuelve
  `response`, **sin ningún redirect**. El comentario del archivo dice
  explícitamente que eso es tarea de B.3.
- `src/lib/supabase/server.ts`: `getSupabaseClient()` async, cliente
  `anon` vía `@supabase/ssr`, `setAll` envuelto en try/catch mudo (comentario
  asume solo el caso "Server Component").
- `src/lib/supabase/proxy-client.ts`: `createProxyClient(request)`,
  exclusivo de `proxy.ts`, lee/escribe cookies vía `NextRequest`/`Response`.
- **`src/lib/auth/` no existe todavía** — se crea desde cero.
- `src/app/layout.tsx`: función síncrona (no async), fuente Montserrat
  local, `<nav>` fijo con 2 links (Dashboard 414, Planeación), **sin nada
  de sesión/usuario**.
- Tabla `profiles` (`supabase/migrations/20260808233430_fase_b_profiles.sql`):
  `user_id uuid PK → auth.users(id) on delete cascade`, `role text check
  (role in ('admin','viewer'))`, `full_name text`, `created_at timestamptz`.
  RLS habilitado sin `force row level security` (necesario para que
  `is_admin()` no recurse). Policies: `profiles_self_read` (select propio),
  `profiles_admin_all` (`is_admin()`). **No hay policy para `anon`** — leer
  el rol del usuario logueado debe hacerse con el cliente ya autenticado
  (cookies de sesión), no con un cliente anon puro.
- `is_admin()`: `security definer stable`, `exists(select 1 from profiles
  where user_id = auth.uid() and role = 'admin')`, ejecución revocada de
  `anon`, otorgada a `authenticated`.
- `scripts/create_user.mjs` confirma los valores literales de rol:
  **solo `"admin"` o `"viewer"`**, nada más.
- `src/components/ui/input.tsx`: envuelve `@base-ui/react/input`, acepta
  cualquier prop nativa de `<input>` vía spread — reutilizable tal cual.
- `src/components/ui/button.tsx`: envuelve `@base-ui/react/button`,
  variantes `default|outline|secondary|ghost|destructive|link`, tamaños
  `default|xs|sm|lg|icon...`. Variante `default` hoy usa
  `hover:bg-primary/80` (a reemplazar, ver decisión 5).
- Patrón `Promise` para `params`/`searchParams` en Next 16.2.12
  (confirmado en `src/app/requerimiento/[item]/page.tsx:10-16`): la página
  es `async`, tipa `params`/`searchParams` como `Promise<...>` y hace
  `await` antes de usarlos. Replicar igual en `/login` y `/login/recuperar`.
- `redirect()` de Next lanza una excepción de control (`NEXT_REDIRECT`) —
  **debe quedar fuera de cualquier `try/catch`** en las Server Actions, o
  el `catch` se la come y el flujo parece fallar aunque el login funcionó.
- Versión exacta: Next `16.2.12`, React `19.2.4`.

### Diseño ya sincronizado (`design/*.dc.html`, no reabrir en Claude Design)

- **Login**: tarjeta centrada (`max-width: 400px`, `padding: 40px 36px`,
  `border-radius: 14px`, `box-shadow` suave) sobre fondo `--surface-muted`
  (`#F7F8FA`). **Sin panel lateral** (descartado explícitamente en el
  diseño). Logo Positiva (`design/assets/logo-positiva.svg` o ruta
  equivalente en el repo — confirmar ubicación real del asset al
  implementar) → título "Iniciar sesión" → banner opcional → campos Correo
  / Contraseña con label → botón "Entrar" ancho completo → link
  "¿Olvidaste tu contraseña?".
- **Copy exacto (verbatim, no parafrasear):**
  - Labels: `"Correo"` (placeholder `"nombre@positiva.gov.co"`),
    `"Contraseña"` (placeholder `"••••••••"`).
  - Botón: `"Entrar"`.
  - Link: `"¿Olvidaste tu contraseña?"`.
  - Banner warning (expirado): `"Tu sesión expiró. Vuelve a iniciar sesión."`
  - Banner destructive (credenciales): `"Correo o contraseña incorrectos."`
    (genérico, no dice qué campo falló — coincide con el criterio de
    aceptación del roadmap).
  - Banner success (logout): `"Cerraste sesión correctamente."`
  - Recuperar: título `"Recuperar contraseña"`, subtítulo `"Ingresa tu
    correo y te enviaremos un enlace."`, label `"Correo"`, botón `"Enviar
    enlace"`, link `"← Volver a iniciar sesión"`.
  - Confirmación de envío: ícono check en `--success-text`, título
    `"Revisa tu correo"`, texto `"Si el correo existe, te enviamos un
    enlace para restablecer tu contraseña."`, link `"← Volver a iniciar
    sesión"`.
  - Error de validación de campo (inline, bajo el input, **nunca** en el
    banner genérico): `"Ingresa un correo válido."` en `--destructive-text`.
- **Estados de input**: focus (`box-shadow: 0 0 0 3px color-mix(in oklch,
  primary, white 80%)`), error (`border: #E5484D` + texto debajo), disabled
  (`background: --surface-muted`, texto `#9AA7B0`).
- **Estados de botón**: default `--primary`, hover `--primary-hover`
  (`#E56700`), focus (anillo `color-mix` con primary), disabled
  `--primary-disabled` (`#FFD3AD`), loading (spinner 14px a la izquierda
  del label, botón deshabilitado).
- **Alert, 3 variantes** (fórmula `color-mix(in oklch, <color>, white N%)`
  para el fondo, `padding: 12px 14px`, `border-radius: 10px`,
  `font-size: 13px`):
  - warning: bg `color-mix(in oklch, #FF7500, white 92%)`
    (= `--warning-bg`), texto `--warning-text` (`#8A4300`).
  - destructive: bg `color-mix(in oklch, #E5484D, white 92%)`, texto
    `--destructive-text` (`#B3261E`).
  - success: bg `color-mix(in oklch, #22A06B, white 92%)`, texto
    `--success-text` (`#178A56`).
- **Badge de rol en el nav** (pill, `font-size: 12px; font-weight: 600;
  padding: 3px 10px; border-radius: 999px`), ubicado a la derecha, junto
  al nombre del usuario y antes del botón de cerrar sesión:
  - Admin: bg `--warning-bg`, texto `--warning-text` (mismo par de tokens
    que el banner de "expirado" — reuso semántico intencional del diseño,
    no es un error).
  - Viewer: bg `--secondary`/`--muted` (`#EDEFF2`), texto
    `--muted-foreground` (`#627887`).

### Tokens en `globals.css` (ya existen, confirmar líneas al editar)

`:root` (~líneas 110-118): `--surface-muted: #F7F8FA`, `--success: #22A06B`,
`--success-text: #178A56`, `--destructive-text: #B3261E`, `--warning-bg:
color-mix(in oklch, #FF7500, white 92%)`, `--warning-text: #8A4300`. Y
(~líneas 71-74) `--primary-hover: #E56700`, `--primary-disabled: #FFD3AD`.
Los primeros 6 ya están mapeados en `@theme inline` (~líneas 56-61) como
`--color-surface-muted`, `--color-success`, `--color-success-text`,
`--color-destructive-text`, `--color-warning-bg`, `--color-warning-text`
→ clases Tailwind `bg-surface-muted`, `text-success-text`, etc. ya
disponibles. **`--primary-hover`/`--primary-disabled` NO están mapeados
todavía** — agregar `--color-primary-hover: var(--primary-hover);
--color-primary-disabled: var(--primary-disabled);` al bloque
`@theme inline`. No hay overrides para ninguno de estos 8 tokens en el
bloque `.dark` — fuera de alcance de esta unidad (el proyecto no tiene
toggle de dark mode activo hoy).

## Archivos a crear

- **`src/lib/auth/session.ts`** — `getCurrentProfile()` envuelto en
  `cache()` de React (dedupe dentro del mismo request: layout + página +
  futuros `RoleGate` consultan una sola vez); usa **`auth.getUser()`**,
  nunca `getSession()`; hace join/consulta a `profiles` con el cliente de
  `server.ts` (ya autenticado vía cookies); un usuario sin fila en
  `profiles` devuelve `null` (= sin rol = no autorizado).
  `requireAuth()` → `redirect("/login")` si `null`.
  `requireAdmin()` → `redirect("/")` si el rol es `"viewer"`.
- **`src/app/login/page.tsx`** (Server Component, `async`): `searchParams`
  tipado `Promise<{ next?: string; msg?: string }>`, `await` inmediato,
  igual que el patrón de `requerimiento/[item]/page.tsx`. Si ya hay perfil
  → `redirect("/")`. Renderiza `<Alert>` según `msg` (`expired` → warning,
  `logged-out` → success) y `<LoginForm next={next} />`.
- **`src/app/login/actions.ts`**: `loginAction(prevState, formData)` —
  validación mínima a mano (**no** meter zod aquí todavía, decisión
  original del roadmap); `signInWithPassword`; en error, mensaje genérico
  `"Correo o contraseña incorrectos."`; `redirect(next ?? "/")`
  **fuera** del `try/catch`. `cerrarSesion()` → `signOut()` →
  `redirect("/login?msg=logged-out")`, invocada desde
  `<form action={cerrarSesion}>` en el layout (no `onClick`).
- **`src/components/auth/login-form.tsx`** (`"use client"`):
  `useActionState(loginAction, { error: null })` — el tercer elemento da
  `pending` sin `useFormStatus`. Reusa `Input`/`Button`/`Label` de `ui/`;
  muestra `<Alert variant="destructive">` si `state.error`; botón con
  `<Spinner>` cuando `pending`.
- **`src/app/login/recuperar/page.tsx`** (Server Component simple, sin
  lógica de sesión — es una ruta pública).
- **`src/app/login/recuperar/actions.ts`**: `recuperarAction(prevState,
  formData)` → `resetPasswordForEmail(email, { redirectTo:
  "<origin>/login/restablecer" })`; siempre responde `{ sent: true }`
  (nunca reveles si el correo existe — coincide con el copy "Si el correo
  existe...").
- **`src/components/auth/recuperar-form.tsx`** (`"use client"`):
  `useActionState`; si `state.sent` renderiza la tarjeta "Revisa tu correo"
  en vez del formulario (misma ruta, sin navegación extra — no hace falta
  una segunda página para el estado "recover-sent" del diseño).
- **`src/app/login/restablecer/page.tsx`** + **`actions.ts`** (sin
  diseño de referencia, construir con los mismos átomos): formulario de
  nueva contraseña + confirmación (`updateUser({ password })` de Supabase,
  que usa la sesión de recuperación que Supabase establece automáticamente
  al aterrizar desde el link del correo); tras éxito, `redirect("/login")`
  con mensaje de éxito reusando el patrón de banner.
- **`src/components/ui/alert.tsx`** — variantes `warning | destructive |
  success` (además del `default` que shadcn suele traer), usando `cva`
  igual que `button.tsx`/`badge.tsx`, con las fórmulas `color-mix` exactas
  del diseño.
- **`src/components/ui/label.tsx`** — wrapper simple (nativo `<label>` o
  `@base-ui/react/label` si el resto del proyecto ya sigue ese patrón;
  confirmar disponibilidad del paquete al implementar) con la tipografía
  del diseño.
- **`src/components/ui/spinner.tsx`** — wrapper delgado de `Loader2` de
  `lucide-react` (`animate-spin`, tamaño 14px por defecto), reusado por
  `login-form.tsx` y `recuperar-form.tsx`.
- **`src/components/auth/role-badge.tsx`** — pill de rol para el nav
  (Server Component, sin necesidad de `"use client"`), usa directamente
  las clases de tokens (`bg-warning-bg text-warning-text` para admin,
  `bg-secondary text-muted-foreground` para viewer) en vez de extender el
  `Badge` genérico (evita mezclar variantes semánticas de rol con las
  variantes de estado que ya usa el resto del dashboard).

## Archivos a modificar

- **`src/proxy.ts`**: tras `getUser()`, si no hay usuario y el pathname no
  empieza por `/login` (cubre `/login`, `/login/recuperar`,
  `/login/restablecer`): revisar si la request ya traía alguna cookie
  `sb-*-auth-token` **antes** de la llamada a `getUser()` para decidir
  `msg=expired` vs sin `msg`; construir
  `NextResponse.redirect(new URL("/login?next=" + pathname + (msg ? "&msg="+msg : ""), request.url))`.
  **Gotcha crítico ya documentado en el roadmap**: copiar las cookies que
  el cliente Supabase escribió en `response` sobre la respuesta de
  redirección, o el token refrescado se pierde y se produce un bucle
  (`ERR_TOO_MANY_REDIRECTS`).
- **`src/app/layout.tsx`**: pasa a `async`; llama `getCurrentProfile()`;
  si hay perfil, renderiza nav con email, `<RoleBadge role={...}>`, y
  `<form action={cerrarSesion}><button>Cerrar sesión</button></form>`; si
  no hay perfil (p. ej. en `/login`), no renderiza nav — sin necesidad de
  route groups. Mantener `print:hidden` ya existente.
- **`src/app/globals.css`**: agregar el mapeo de `--primary-hover`/
  `--primary-disabled` a `@theme inline` (decisión 5).
- **`src/components/ui/button.tsx`**: variante `default` de
  `buttonVariants` pasa de `hover:bg-primary/80` a `hover:bg-primary-hover
  disabled:bg-primary-disabled` (clases nuevas del punto anterior).
  Verificar que el resto de botones `default` del dashboard (ej. filtros,
  exportar PDF) no dependan visualmente del comportamiento anterior de
  forma que rompa algo — deberían verse igual o más fieles al diseño.

## Orden de implementación sugerido

1. Copiar este plan a `dashboard-414/PLAN_UNIDAD_B3.md` (primer commit de
   la rama, antes de tocar código).
2. Crear rama `fase-b/b3-login-sesion`.
3. Tokens/UI de base primero (sin lógica de auth todavía): mapeo
   `primary-hover`/`primary-disabled` en `globals.css` + `button.tsx`,
   luego `alert.tsx`, `label.tsx`, `spinner.tsx` — verificar visualmente
   contra el `.dc.html` antes de seguir.
4. `src/lib/auth/session.ts` (sin consumidores todavía, se prueba con un
   `console.log` temporal o similar antes de conectar UI).
5. `/login` completo (page + actions + login-form + role-badge) —
   **antes de tocar `proxy.ts`**, así se puede probar el login manualmente
   navegando directo a `/login` mientras el resto del sitio sigue público.
6. `/login/recuperar` + `/login/restablecer`.
7. Ampliar `src/proxy.ts` (redirect + detección expired) — este es el
   paso que activa la protección real; probar de inmediato.
8. `src/app/layout.tsx` async con nav de sesión + logout.
9. Verificación end-to-end completa (ver abajo) antes de abrir el PR.

## Aceptación (ampliada respecto al roadmap original)

- Anónimo en producción/local → 307 a `/login` (sin `msg`, primera visita),
  carga con estilos y tipografías (200).
- Login con Admin y con Viewer funcionan, ambos ven los datos, cada uno ve
  su badge de rol correcto en el nav.
- Credenciales malas → banner destructive genérico, sin excepción en
  consola, sin redirect de por medio.
- Logout → `/login?msg=logged-out` con banner success, cookie de sesión
  limpia.
- Sesión con cookie presente pero inválida/expirada → `/login?next=...&msg=expired`
  con banner warning (probar manualmente invalidando/borrando la sesión en
  Supabase o esperando expiración, o simulando cookie corrupta).
- Recuperar contraseña: solicitar con un correo real de los 2 usuarios de
  prueba → llega el correo → el link aterriza en
  `/login/restablecer` → se puede definir una nueva contraseña → login
  posterior funciona con la contraseña nueva.
- Sin bucle de redirección (`ERR_TOO_MANY_REDIRECTS`) en ningún flujo.
- `npm run lint`/`tsc`/`build` limpios.

## Rollback

Revert + redeploy → el sitio vuelve a ser público (RLS no se toca en esta
unidad — es el último punto del roadmap en que eso sigue siendo cierto,
según B.4). Sin cambios de esquema de BD en esta unidad (recuperar
contraseña usa las APIs estándar de `auth.users`, no toca `profiles`).
