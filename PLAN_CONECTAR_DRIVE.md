# Plan: conectar Dashboard 414 a Google Drive como fuente de datos

> Este archivo es un plan **ejecutable por una sesión distinta** a la que lo
> escribió — no asumas contexto de conversación previa. Todo lo que necesitas
> saber para implementarlo está aquí. Si algo no está cubierto, es porque
> deliberadamente quedó fuera de alcance (ver "Fuera de alcance" al final),
> no porque se olvidó.

## Contexto (por qué)

El proyecto `dashboard-414` (Next.js, ver su propio `CLAUDE.md` para la
arquitectura completa) ya está importado en Vercel desde
`https://github.com/jebb10/Tablero.git`, pero **hoy muestra el banner de
error en producción**: el código lee
`../REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx` con `fs.readFileSync`, un
archivo que vive fuera del repo git — Vercel no tiene forma de acceder a él.

El PO subió una copia de ese Excel a Google Drive:
`https://docs.google.com/spreadsheets/d/1J08Zow6iEb1BZC5ny90gpvma1JtWcYC2/...`,
compartida como "cualquiera con el enlace puede ver", y decidió que esta
sea la fuente de datos de producción de aquí en adelante — de forma
indefinida (confirmado explícitamente que la exposición pública del
documento, con datos internos de horas/notas, es aceptable por ahora).

**Verificado en la sesión que escribió este plan** (solo lectura, sin tocar
nada):
- `GET https://docs.google.com/spreadsheets/d/1J08Zow6iEb1BZC5ny90gpvma1JtWcYC2/export?format=xlsx`
  responde `200`, `Content-Type:
  application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, sin
  necesitar credenciales. El archivo en Drive **conserva el formato Excel
  original** (no se convirtió a Sheets nativo).
- Se inspeccionaron las hojas internas del zip (`xl/workbook.xml`): mismo
  set exacto que el xlsx local ya estandarizado en Fase 0/0.1 —
  `Dashboard Principal`, las 7 hojas de detalle (Siniestros, Viajeros,
  Página Noticias, Directorio Médico, Puntos de Atención, Wompi, Rediseño
  +Salud), `Plantilla requerimiento`, y las hojas ocultas `NO USAR - *`. Es
  una copia 1:1, no un documento distinto — **no hace falta re-auditar
  estructura ni re-estandarizar nada**.

Conclusión: el cambio es puramente el **origen de los bytes** del workbook.
Todo el parseo existente (`sheetRows`, `getRequerimientos`, `getDetalle`,
KPIs, calidad de datos) se reutiliza sin tocar su lógica de negocio.

## Decisiones confirmadas con el PO (no las re-preguntes)

- Alcance: **solo** conectar Drive y arreglar el banner en producción. El
  login con Google (Auth.js, diseñado en la Fase 3 original de CLAUDE.md)
  queda para un plan/sesión aparte — no lo implementes aquí.
- Lectura vía descarga pública directa del export xlsx (sin cuenta de
  servicio de Google). El PO confirmó que está de acuerdo con que el link
  siga siendo público indefinidamente.
- Estrategia de caché: **ventana corta de revalidación (30 segundos)**, no
  `no-store` estricto. El botón "Sincronizar" (RN-05, ver `actions.ts`)
  sigue existiendo para forzar un refetch manual; la ventana de 30s es solo
  para amortiguar picos/rate-limits de Google entre clicks, no para cambiar
  la semántica de "sync manual, sin polling".
- Timeout explícito de **10 segundos** en el fetch a Drive (vía
  `AbortController`), para no dejar colgada la función serverless de
  Vercel si Drive responde lento.
- **Un solo intento**, sin reintentos automáticos — igual que el
  comportamiento actual con `fs.readFileSync` (fallaba una vez, caía al
  fallback de último-resultado-bueno).
- Env var: `DASHBOARD_SHEET_ID` (solo el ID, no la URL completa).
- Desarrollo local: **siempre contra Drive**, mismo camino que producción —
  no mantener un modo offline con xlsx local. Se necesita internet para
  `npm run dev`.
- Documentar la env var en **CLAUDE.md y README.md**.
- Configurar la env var en Vercel lo hace el PO manualmente — la sesión
  ejecutora **no** toca el dashboard de Vercel ni intenta desplegar.
- Verificación: **solo smoke test local** (`npm run dev`). No se pide
  verificar producción real como parte de esta tarea.
- El archivo Excel local y la carpeta `scripts/` (Python de Fase 0/0.1) se
  **mueven** a una subcarpeta `legado/` dentro de
  `Documents\Tablero Requerimientos\` (no se borran, se archivan).
- La sección "Convenciones al tocar el Excel fuente" de CLAUDE.md (reglas de
  `openpyxl`) se **borra** — ya no aplica, nadie va a volver a tocar el xlsx
  local con scripts.
- Este cambio se documenta como una **sub-fase nueva** en el roadmap de
  CLAUDE.md: "Fase 3a — Conectar Drive como fuente de datos", separada del
  login (que queda como el pendiente real de "Fase 3").
- Git: commit directo a `master`, como en sesiones anteriores — sin
  rama/PR.
- Mensaje de error/banner: pasa de "archivo bloqueado" a un texto genérico
  de conexión (ver punto 4 de Cambios). Mismo banner para **cualquier**
  falla — incluida la env var faltante — no hay un mensaje especial
  distinto para ese caso.
- Indicador de "última sincronización" (hora del último fetch exitoso):
  **diferido**, no se agrega en este plan.

## Cambios a implementar

### 1. `src/lib/excel/workbook.ts` — nuevo origen de datos

Reemplazar `loadWorkbook()` (síncrono, `fs.readFileSync`) por una versión
`async` que descarga el xlsx desde Drive, con timeout de 10s y cache
`revalidate: 30`:

```ts
import * as XLSX from "xlsx";

const SHEET_ID = process.env.DASHBOARD_SHEET_ID;

export async function loadWorkbook(): Promise<XLSX.WorkBook> {
  if (!SHEET_ID) {
    throw new Error("Falta la variable de entorno DASHBOARD_SHEET_ID");
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      throw new Error(`No se pudo descargar el Google Sheet (status ${res.status})`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return XLSX.read(buffer, { type: "buffer", cellDates: true });
  } finally {
    clearTimeout(timeout);
  }
}
```

- Elimina `WORKBOOK_PATH`, y los imports de `fs` y `path` (ya no se usan en
  este archivo).
- El resto del archivo (`sheetRows`, `toNumber`, `toText`, `toDate`,
  `parseEtiquetaValor`, `slugify`) **no cambia**.
- Nota sobre `next: { revalidate: 30 }` vs `cache: "no-store"`: son
  mutuamente excluyentes en Next.js (usar ambos genera warning/conflicto en
  dev) — usar solo `revalidate`.

### 2. Propagar el `async` hacia arriba

`loadWorkbook()` ya no puede usarse como valor por defecto en un parámetro
(un default param no puede hacer `await`). Actualizar:

- **`src/lib/excel/dashboard-sheet.ts`**: cambiar la firma de
  `getRequerimientos(wb: XLSX.WorkBook = loadWorkbook())` a
  `getRequerimientos(wb: XLSX.WorkBook)` — quitar el default, parámetro
  requerido. El resto del cuerpo de la función no cambia.
- **`src/lib/excel/detalle-sheet.ts`**: mismo cambio en `getDetalle` —
  `getDetalle(hojaNombre: string, wb: XLSX.WorkBook)`, sin default.
- **`src/lib/dashboard-data.ts`** (`getDashboardData`): pasa a `async`:
  ```ts
  export async function getDashboardData(): Promise<...> {
    try {
      const wb = await loadWorkbook();
      const requerimientos = getRequerimientos(wb);
      const kpis = getKPIs(requerimientos);
      ultimoResultadoBueno = { requerimientos, kpis };
      return { requerimientos, kpis, error: false, ultimoResultadoNulo: false };
    } catch {
      // ... el resto del catch existente no cambia
    }
  }
  ```
  El caché en memoria `ultimoResultadoBueno` (`let` a nivel de módulo) se
  mantiene igual — ahora también cubre fallos de red/timeout hacia Drive,
  no solo archivo bloqueado.
- **`src/app/page.tsx`**: cambiar
  `const { requerimientos, kpis, error, ultimoResultadoNulo } = getDashboardData();`
  por `const { ... } = await getDashboardData();` (el componente ya es
  `async`).
- **`src/app/requerimiento/[item]/page.tsx`**: dentro del `try` existente,
  cambiar `wb = loadWorkbook()` por `wb = await loadWorkbook()`. La llamada
  a `getDetalle(requerimiento.hojaDetalle, wb)` no cambia, ya pasa `wb`
  explícito.
- **`src/app/actions.ts`** (`sincronizar`): sin cambios — solo llama a
  `refresh()` de `next/cache`, no toca el workbook directamente.

### 3. `src/components/archivo-bloqueado-banner.tsx` — texto genérico

Cambiar el copy visible de "archivo bloqueado" (pensado para el xlsx local
abierto en otro programa) a un mensaje genérico de conexión, por ejemplo:
"No se pudo cargar la información. Hubo un problema de conexión con la
fuente de datos." — no renombres el componente ni sus props (sigue
usándose igual desde `page.tsx` y `dashboard-client.tsx`), solo el texto
visible. Este mismo mensaje cubre **todos** los casos de falla dentro de
`loadWorkbook`/`getDashboardData`, incluida la env var `DASHBOARD_SHEET_ID`
faltante — no agregues un mensaje especial distinto para ese caso.

### 4. Archivar los archivos legado

Mover (no borrar) en `Documents\Tablero Requerimientos\` (un nivel arriba de
`dashboard-414/`, fuera del repo git):
- `REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx` → `legado\REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx`
- `scripts\` (carpeta completa, incluye `auditar_hojas.py`,
  `estandarizar_hojas_detalle.py`, `backups\`) → `legado\scripts\`

Esto es un simple movimiento de archivos en disco (`Move-Item` en
PowerShell), no afecta el repo git de `dashboard-414` porque estos archivos
ya vivían fuera de él.

### 5. `src/README.md` (el del proyecto `dashboard-414`)

Agregar una sección corta documentando la env var requerida:

```md
## Variables de entorno

- `DASHBOARD_SHEET_ID`: ID del Google Sheet que sirve como fuente de datos
  (ver CLAUDE.md, sección "Fuente de datos"). Requerido tanto en desarrollo
  local (`.env.local`) como en producción (Vercel → Project Settings →
  Environment Variables).
```

### 6. `CLAUDE.md` — actualizar documentación

- **Sección "Fuente de datos"**: reescribir para describir el nuevo flujo:
  descarga pública del export xlsx de Google Drive vía
  `DASHBOARD_SHEET_ID`, con `revalidate: 30` y timeout de 10s (un solo
  intento, sin reintentos). Documentar la limitación: depende de que el
  link siga siendo público indefinidamente — si algún día se restringe, hay
  que migrar a una cuenta de servicio de Google (Sheets/Drive API). Quitar
  las referencias a `fs.readFileSync` y a la ruta del xlsx local como fuente
  activa.
- **Eliminar por completo** la sección "Convenciones al tocar el Excel
  fuente" (reglas de `openpyxl`) — ya no aplica.
- **Tabla "Archivos clave"**: actualizar la fila de `src/lib/excel/workbook.ts`
  para reflejar que ahora hace `fetch` en vez de `fs.readFileSync`.
- **Roadmap de fases**: insertar una nueva entrada **"Fase 3a — Conectar
  Drive como fuente de datos"**, marcada ✅ completa, con un resumen de lo
  hecho (fetch al export público, revalidate 30s, timeout 10s, banner
  genérico, archivo/scripts legado movidos a `legado/`). Dejar la Fase 3
  original (login Auth.js + Vercel Blob) como el pendiente restante,
  aclarando que la parte de "Vercel Blob para el Excel" del diseño original
  queda **descartada** (ya no aplica, Drive reemplaza esa idea) y solo
  queda pendiente el login con Google.
- Mencionar en el roadmap que el problema de fórmulas sin valor cacheado
  (openpyxl nunca las calcula) ya no debería repetirse: Google Sheets sí
  recalcula y cachea fórmulas automáticamente al editar desde su UI web —
  esto es una mejora incidental, no una tarea nueva a resolver.

## Verificación

1. `npx tsc --noEmit` y `npm run lint` en `dashboard-414` — deben quedar
   limpios tras los cambios de tipos (`async`, sin defaults en parámetros).
2. Crear `.env.local` en `dashboard-414/` con:
   ```
   DASHBOARD_SHEET_ID=1J08Zow6iEb1BZC5ny90gpvma1JtWcYC2
   ```
3. Correr `npm run dev` y confirmar:
   - La vista principal carga los 28 requerimientos con datos reales
     (no vacíos, no banner de error).
   - Al menos un drill-down de los 7 con hoja de detalle (ej.
     `/requerimiento/siniestros` o el slug que corresponda) muestra fases y
     tareas correctamente.
   - El botón "Sincronizar" no rompe nada al hacer clic.
4. No se requiere verificar producción como parte de esta tarea — eso lo
   hace el PO por su cuenta después de desplegar (ver instructivo abajo).

## Instructivo para el PO (acción manual, no automatizable desde el código)

Una vez el código de este plan esté implementado y pusheado a `master`,
tú (PO) debes hacer esto manualmente para que tome efecto en producción:

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con la cuenta
   que tiene el proyecto `Tablero` conectado.
2. Abre el proyecto del dashboard 414 dentro de Vercel.
3. Ve a **Settings → Environment Variables**.
4. Agrega una nueva variable:
   - **Key**: `DASHBOARD_SHEET_ID`
   - **Value**: `1J08Zow6iEb1BZC5ny90gpvma1JtWcYC2`
   - **Environments**: marca las tres (Production, Preview, Development) a
     menos que quieras manejarlas distinto.
5. Guarda. Vercel normalmente pide un **redeploy** para que una env var
   nueva tome efecto — ve a la pestaña **Deployments**, entra al último
   deployment y usa el botón **Redeploy** (o simplemente espera al próximo
   push a `master`, que ya la incluirá).
6. Una vez termine el redeploy, entra a la URL pública del proyecto y
   confirma que el banner de error desapareció y que ves los 28
   requerimientos con datos reales — si el banner sigue ahí, revisa en
   **Deployments → (el deployment) → Function Logs** el mensaje de error
   exacto (puede ser que el valor de la env var tenga un typo, o que el
   link de Drive haya dejado de ser público).

## Fuera de alcance (a propósito, no lo hagas en este plan)

- Login con Google / Auth.js (Fase 3 original de CLAUDE.md).
- Restringir el acceso al Google Sheet o migrar a una cuenta de servicio de
  Google — el PO confirmó que el link público está bien por ahora.
- Indicador de "última sincronización" en la UI.
- Reestructurar el Excel, tocar los 21 requerimientos heurísticos, o crear
  hojas de detalle nuevas — nada de eso cambia con este plan.
- Reintentos automáticos ante fallo de fetch, o alertas adicionales más
  allá del banner + caché de último-resultado-bueno existente.
