# Pendientes — Dashboard 414

Único trabajo de fondo que sigue sin ejecutarse tras el cierre técnico de 2026-08-11: la **Fase D
(documentos vigentes, sin versionado)**. El resto del roadmap (Fase 0, B, C, C1, C2, C3) está
completo y verificado en producción — su historial de ejecución vive en git (PRs #9–#16), no en un
documento aparte. Ver `CLAUDE.md` para el estado vigente del proyecto.

Este documento conserva el diseño detallado de la Fase D tal como quedó especificado en
`ROADMAP_V2.md` (retirado del repo en el cierre de documentación de 2026-08-11), para que se pueda
retomar sin rediseñar desde cero.

---

# FASE D — Documentos vigentes (SIN versionado)

> **Este diseño reemplaza por completo la Fase D del roadmap v1.** Por decisión del PO, **no hay
> versionado**: subir un documento nuevo **borra el anterior y lo reemplaza**. Desaparecen `is_latest`,
> `version`, el índice único parcial, el historial colapsable y la RPC transaccional de dos pasos que
> el v1 diseñaba. **Consecuencia aceptada explícitamente por el PO: no hay historial de versiones ni
> forma de recuperar un documento reemplazado** (más allá del backup diario de Supabase).
>
> **Beneficio:** el cálculo de storage baja de ~1.3 GB a **~0.34 GB** (28 × 4 × 3 MB), holgadamente
> dentro del free tier de Supabase (1 GB).

## Unidad D.1 — Esquema y bucket

**`document_versions` ya se eliminó** (cierre técnico pre-refinamiento, 2026-08-11) — estaba vacía y
sin ninguna policy RLS, scaffolding de un diseño que nunca se implementó. Cuando se retome esta
unidad, el primer paso ya no es `drop table`, es directamente el `create table
requirement_documents` de abajo.

```sql
create table requirement_documents (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  document_name  varchar(255) not null,
  storage_path   text not null,
  file_name      text not null,
  file_size      bigint,
  mime_type      text,
  uploaded_by    uuid references auth.users(id),
  uploaded_at    timestamptz not null default now(),
  constraint requirement_documents_unico unique (requirement_id, document_name)
);
create index idx_requirement_documents_requirement on requirement_documents(requirement_id);

alter table requirement_documents enable row level security;
create policy "read_authenticated" on requirement_documents
  for select to authenticated using (true);
create policy "admin_write" on requirement_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

**Notas de diseño.**
- **Tabla renombrada a `requirement_documents`**: mantener el nombre `document_versions` sin versiones
  sería engañoso para cualquier sesión futura.
- `unique (requirement_id, document_name)` **es el invariante central**: un documento, una fila. Un
  documento del mismo nombre reemplaza al anterior por `upsert`, no duplica.
- `storage_path`, **no `file_url`**: el bucket es privado y sus URLs son firmadas y efímeras —
  almacenar una URL sería almacenar algo caducado.
- **Sí se conserva policy de `delete`**: reemplazar implica borrar, y además el PO necesita poder
  quitar un documento obsoleto.
- **Bucket privado** `requirement-documents` (`public: false`), ruta
  `{project_slug}/{requirement_id}/{document_name_slug}/{file_name}` (`slugify()` de `src/lib/slug.ts`;
  el prefijo de proyecto se conserva aunque hoy solo haya uno, coherente con el modelo
  multi-proyecto).
- Policies sobre `storage.objects` reflejando lo mismo.
  **[VERIFICAR EN VIVO]** que `is_admin()` es invocable desde las policies de `storage.objects` (está
  en `public`; puede requerir cualificar `public.is_admin()`).

## Unidad D.2 — Subida firmada + reemplazo

Flujo en dos pasos para que los bytes **no pasen por la Server Action** (que tiene límite de body):

1. `getUploadUrl({requirementId, documentName, fileName, fileSize, mimeType})`: `requireAdmin()` → zod
   → **tope de 20 MB** (mensaje sugiriendo el enlace de Drive para assets pesados) → construir
   `storage_path` → `createSignedUploadUrl(path)` → devolver `{path, token}`. **No escribe fila.**
2. El navegador sube con `uploadToSignedUrl(path, token, file)`. Requiere el cliente browser de
   `@supabase/ssr` — crear `src/lib/supabase/client.ts` aquí si no existe todavía.
3. `confirmarDocumento({...})`: `requireAdmin()` → **si ya existe fila para ese
   `(requirement_id, document_name)`, borrar el objeto anterior de Storage** (`storage.remove([viejo])`)
   → `upsert` de la fila con `on_conflict: "requirement_id,document_name"` → `refresh()`.
   **El orden importa**: borrar el objeto viejo solo **después** de que el nuevo subió correctamente.
4. `getDownloadUrl(id)`: `createSignedUrl(path, 60)` — URL efímera generada bajo demanda; **nunca se
   persiste una URL**.
5. **Modo de fallo conocido y aceptado**: si el paso 2 tiene éxito y el 3 falla (cierre de pestaña,
   red), queda un objeto huérfano en Storage sin fila. **No se sobre-ingeniera limpieza automática**;
   se documenta una query de barrido admin al pie de la migración (objetos de `storage.objects` sin
   `storage_path` correspondiente). El caso inverso —fila sin objeto— es imposible por el orden.

## Unidad D.3 — UI de documentos en el detalle

- Sección "Documentos": una fila por documento con nombre, archivo, quién y cuándo, y botón Descargar
  (invoca `getDownloadUrl` y abre la URL). **Eso es todo lo que hay que ver** — es la respuesta directa
  a "¿cuál es la versión vigente?".
- "Reemplazar" (Admin) por documento existente, y "Subir documento nuevo" (Admin) que pide el
  `document_name` — con un `datalist` de nombres ya usados en el proyecto: mitigación barata contra
  "Acta de reunión" vs "Acta Reunión" como documentos distintos.
- **Al reemplazar, un `alert-dialog` de confirmación explícito**: "Esto borra permanentemente el
  archivo anterior. Esta acción no se puede deshacer." — es obligatorio dado que no hay historial.
- Junto al botón de subida, enlace a `documentation_folder_url` etiquetado "Assets pesados (Drive)",
  para que la separación sea explícita en la UI y no una regla no escrita.
- Viewers ven la lista y descargan; **ningún control de escritura llega a su bundle** (`RoleGate`).

## Verificación de cierre de la fase

Subir un documento, reemplazarlo, confirmar que el objeto anterior ya no está en el bucket y que la
descarga del nuevo funciona; un Viewer no ve controles de subida.
