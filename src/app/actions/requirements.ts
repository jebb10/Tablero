"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";
import { PROJECT_SLUG } from "@/lib/project";
import { slugify } from "@/lib/slug";
import { ESTADOS_DB, ESTADO_DB_CERRADO_POR_CAMBIO_ALCANCE, type EstadoDb } from "@/lib/estados";
import { FASES_ORDEN } from "@/lib/fases-orden";
import { z } from "zod";

const devEnvironmentUrlSchema = z.string().url().nullable();

const camposComunesSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio."),
  title: z.string().trim().min(1, "El título es obligatorio."),
  status: z.enum(ESTADOS_DB),
  estimatedHours: z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0, "Las horas estimadas deben ser un número válido (≥ 0)."),
});

export type GuardarRequerimientoState = { error: string | null; success: boolean };

interface CamposComunes {
  code: string;
  title: string;
  category: string | null;
  complexity: string | null;
  month_label: string | null;
  status: EstadoDb;
  deadline: string | null;
  estimated_hours: number;
  notes: string | null;
  dev_environment_url: string | null;
  has_detail_tracking: boolean;
  parent_requirement_id: string | null;
}

type LecturaCampos = { error: string; valores?: undefined } | { error: null; valores: CamposComunes };

function texto(formData: FormData, nombre: string): string | null {
  const v = formData.get(nombre);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Unidad C2.3 — validación compartida entre crear/editar/cambio de alcance.
function leerCamposComunes(formData: FormData): LecturaCampos {
  const camposParseados = camposComunesSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    status: formData.get("status"),
    estimatedHours: formData.get("estimatedHours"),
  });
  if (!camposParseados.success) {
    const primerIssue = camposParseados.error.issues[0];
    const error = primerIssue.path[0] === "status" ? "Estado inválido." : primerIssue.message;
    return { error };
  }
  const { code, title, status, estimatedHours } = camposParseados.data;

  const deadline = texto(formData, "deadline");
  const parentRequirementId = texto(formData, "parentRequirementId");

  const devEnvironmentUrl = devEnvironmentUrlSchema.safeParse(texto(formData, "devEnvironmentUrl"));
  if (!devEnvironmentUrl.success) {
    return { error: "La URL del ambiente de desarrollo no es válida." };
  }

  return {
    error: null,
    valores: {
      code,
      title,
      category: texto(formData, "category"),
      complexity: texto(formData, "complexity"),
      month_label: texto(formData, "monthLabel"),
      status,
      deadline,
      estimated_hours: estimatedHours,
      notes: texto(formData, "notes"),
      dev_environment_url: devEnvironmentUrl.data,
      has_detail_tracking: formData.get("hasDetailTracking") === "on",
      parent_requirement_id: parentRequirementId,
    },
  };
}

function slugParaCrear(formData: FormData, code: string): string {
  const manual = texto(formData, "slug");
  return slugify(manual ?? code);
}

// Horas estimadas por fase (2026-08-12): opcional, independiente del total
// -- no hay validación de que la suma coincida (decisión del PO). Un campo
// vacío se guarda como null (permite "borrar" un estimado ya puesto).
function leerHorasPorFase(
  formData: FormData
): { phaseNumber: number; estimatedHours: number | null }[] {
  return FASES_ORDEN.map((f) => {
    const raw = formData.get(`phaseEstimatedHours_${f.numero}`);
    const valorTexto = typeof raw === "string" ? raw.trim() : "";
    const valor = valorTexto ? Number(valorTexto) : null;
    return {
      phaseNumber: f.numero,
      estimatedHours: valor !== null && Number.isFinite(valor) && valor >= 0 ? valor : null,
    };
  });
}

async function guardarHorasPorFase(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  requirementId: string,
  formData: FormData
) {
  const filas = leerHorasPorFase(formData).map((f) => ({
    requirement_id: requirementId,
    phase_number: f.phaseNumber,
    estimated_hours: f.estimatedHours,
  }));

  await supabase
    .from("requirement_phase_deadlines")
    .upsert(filas, { onConflict: "requirement_id,phase_number" });
}

export async function crearRequerimiento(
  _prevState: GuardarRequerimientoState,
  formData: FormData
): Promise<GuardarRequerimientoState> {
  await requireAdmin();

  const leido = leerCamposComunes(formData);
  if (leido.error !== null) return { error: leido.error, success: false };

  const supabase = await getSupabaseClient();
  const { data: proyecto, error: errorProyecto } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", PROJECT_SLUG)
    .single();
  if (errorProyecto || !proyecto) {
    return { error: "No se encontró el proyecto.", success: false };
  }

  const slug = slugParaCrear(formData, leido.valores.code);

  const { data: nuevo, error } = await supabase
    .from("requirements")
    .insert({ ...leido.valores, project_id: proyecto.id, slug })
    .select("id, slug")
    .single();

  if (error || !nuevo) {
    if (error?.code === "23505") {
      return { error: "Ya existe un requerimiento con ese código o slug.", success: false };
    }
    return { error: "No se pudo crear el requerimiento.", success: false };
  }

  await guardarHorasPorFase(supabase, nuevo.id, formData);

  redirect(`/requerimiento/${nuevo.slug}`);
}

// slug NUNCA se recalcula al editar, aunque cambie code (decisión C2.3).
export async function actualizarRequerimiento(
  requirementId: string,
  _prevState: GuardarRequerimientoState,
  formData: FormData
): Promise<GuardarRequerimientoState> {
  await requireAdmin();

  const leido = leerCamposComunes(formData);
  if (leido.error !== null) return { error: leido.error, success: false };
  if (leido.valores.parent_requirement_id === requirementId) {
    return { error: "Un requerimiento no puede ser su propio padre.", success: false };
  }

  const supabase = await getSupabaseClient();
  const { data: actualizado, error } = await supabase
    .from("requirements")
    .update(leido.valores)
    .eq("id", requirementId)
    .select("slug")
    .single();

  if (error || !actualizado) {
    if (error?.code === "23505") {
      return { error: "Ya existe otro requerimiento con ese código.", success: false };
    }
    return { error: "No se pudo actualizar el requerimiento.", success: false };
  }

  await guardarHorasPorFase(supabase, requirementId, formData);

  redirect(`/requerimiento/${actualizado.slug}`);
}

// Cierra el requerimiento viejo y crea uno nuevo enlazado (Unidad C2.3,
// decisión tomada con el PO). No es una transacción real (supabase-js no
// expone una aquí): si el cierre del viejo falla tras crear el nuevo, se
// avisa en vez de dejarlo huérfano en silencio -- caso raro (falla de red
// entre dos requests seguidos), aceptado para el alcance de esta unidad.
export async function cerrarPorCambioDeAlcance(
  idViejo: string,
  _prevState: GuardarRequerimientoState,
  formData: FormData
): Promise<GuardarRequerimientoState> {
  await requireAdmin();

  const leido = leerCamposComunes(formData);
  if (leido.error !== null) return { error: leido.error, success: false };

  const supabase = await getSupabaseClient();
  const { data: proyecto, error: errorProyecto } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", PROJECT_SLUG)
    .single();
  if (errorProyecto || !proyecto) {
    return { error: "No se encontró el proyecto.", success: false };
  }

  const slug = slugParaCrear(formData, leido.valores.code);

  const { data: nuevo, error: errorNuevo } = await supabase
    .from("requirements")
    .insert({
      ...leido.valores,
      project_id: proyecto.id,
      slug,
      parent_requirement_id: idViejo,
    })
    .select("id, slug")
    .single();

  if (errorNuevo || !nuevo) {
    if (errorNuevo?.code === "23505") {
      return { error: "Ya existe un requerimiento con ese código o slug.", success: false };
    }
    return { error: "No se pudo crear el requerimiento de reemplazo.", success: false };
  }

  await guardarHorasPorFase(supabase, nuevo.id, formData);

  const { error: errorCierre } = await supabase
    .from("requirements")
    .update({ status: ESTADO_DB_CERRADO_POR_CAMBIO_ALCANCE })
    .eq("id", idViejo);

  if (errorCierre) {
    return {
      error: `El nuevo requerimiento se creó (${nuevo.slug}) pero no se pudo cerrar el anterior. Revísalo manualmente.`,
      success: false,
    };
  }

  redirect(`/requerimiento/${nuevo.slug}`);
}
