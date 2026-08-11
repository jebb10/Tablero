"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";
import { PROJECT_SLUG } from "@/lib/project";
import { slugify } from "@/lib/slug";
import { ESTADOS_DB, type EstadoDb } from "@/lib/estados";

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
  billing_date: string | null;
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
  const code = texto(formData, "code");
  const title = texto(formData, "title");
  const status = formData.get("status");

  if (!code) return { error: "El código es obligatorio." };
  if (!title) return { error: "El título es obligatorio." };
  if (typeof status !== "string" || !ESTADOS_DB.includes(status as EstadoDb)) {
    return { error: "Estado inválido." };
  }

  const estimatedHoursRaw = formData.get("estimatedHours");
  const estimatedHours =
    typeof estimatedHoursRaw === "string" && estimatedHoursRaw.trim()
      ? Number(estimatedHoursRaw)
      : 0;
  if (!Number.isFinite(estimatedHours) || estimatedHours < 0) {
    return { error: "Las horas estimadas deben ser un número válido (≥ 0)." };
  }

  const deadline = texto(formData, "deadline");
  const parentRequirementId = texto(formData, "parentRequirementId");

  return {
    error: null,
    valores: {
      code,
      title,
      category: texto(formData, "category"),
      complexity: texto(formData, "complexity"),
      month_label: texto(formData, "monthLabel"),
      status: status as EstadoDb,
      deadline,
      estimated_hours: estimatedHours,
      billing_date: texto(formData, "billingDate"),
      notes: texto(formData, "notes"),
      dev_environment_url: texto(formData, "devEnvironmentUrl"),
      has_detail_tracking: formData.get("hasDetailTracking") === "on",
      parent_requirement_id: parentRequirementId,
    },
  };
}

function slugParaCrear(formData: FormData, code: string): string {
  const manual = texto(formData, "slug");
  return slugify(manual ?? code);
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
    .select("slug")
    .single();

  if (error || !nuevo) {
    if (error?.code === "23505") {
      return { error: "Ya existe un requerimiento con ese código o slug.", success: false };
    }
    return { error: "No se pudo crear el requerimiento.", success: false };
  }

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

  redirect(`/requerimiento/${actualizado.slug}`);
}

// Cierra el requerimiento viejo y crea uno nuevo enlazado (decisión #5 de
// PLAN_EJECUCION_C2_C3.md). No es una transacción real (supabase-js no
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
    .select("slug")
    .single();

  if (errorNuevo || !nuevo) {
    if (errorNuevo?.code === "23505") {
      return { error: "Ya existe un requerimiento con ese código o slug.", success: false };
    }
    return { error: "No se pudo crear el requerimiento de reemplazo.", success: false };
  }

  const { error: errorCierre } = await supabase
    .from("requirements")
    .update({ status: "CERRADO_POR_CAMBIO_ALCANCE" })
    .eq("id", idViejo);

  if (errorCierre) {
    return {
      error: `El nuevo requerimiento se creó (${nuevo.slug}) pero no se pudo cerrar el anterior. Revísalo manualmente.`,
      success: false,
    };
  }

  redirect(`/requerimiento/${nuevo.slug}`);
}
