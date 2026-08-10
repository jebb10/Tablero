import { getSupabaseClient } from "./supabase/server";
import type { Database } from "./supabase/database.types";

export type EventoActividad = Database["public"]["Tables"]["activity_logs"]["Row"]["event_type"];

export interface Actividad {
  id: string;
  eventType: string;
  title: string;
  notes: string | null;
  hoursSpent: number | null;
  loggedAt: Date;
  autor: string | null;
  // Extensión de C1 (2026-08-10): tarea específica a la que se le registró
  // el consumo de horas, si se seleccionó una en el modal. null = actividad
  // a nivel de requerimiento completo (comportamiento histórico).
  taskId: string | null;
}

export async function getActividades(requirementId: string): Promise<{
  actividades: Actividad[];
  error: boolean;
}> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, event_type, title, notes, hours_spent, logged_at, created_by, task_id")
      .eq("requirement_id", requirementId)
      .order("logged_at", { ascending: false });
    if (error) throw error;

    // No hay FK directa activity_logs -> profiles (created_by referencia
    // auth.users), así que PostgREST no puede embeber el join. profiles
    // solo se puede leer por RLS si es el propio perfil o se es Admin
    // (profiles_self_read/profiles_admin_all) — un Viewer no vería el
    // nombre de un autor Admin. nombre_autor() es security definer (mismo
    // patrón que is_admin()) y expone solo el full_name a cualquier
    // autenticado, sin abrir el resto de la tabla profiles.
    const idsAutores = Array.from(
      new Set((data ?? []).map((a) => a.created_by).filter((id): id is string => id !== null))
    );
    const nombrePorId = new Map(
      await Promise.all(
        idsAutores.map(async (id) => {
          const { data: nombre } = await supabase.rpc("nombre_autor", { p_user_id: id });
          return [id, nombre] as const;
        })
      )
    );

    const actividades: Actividad[] = (data ?? []).map((a) => ({
      id: a.id,
      eventType: a.event_type,
      title: a.title,
      notes: a.notes,
      hoursSpent: a.hours_spent,
      loggedAt: new Date(a.logged_at),
      autor: a.created_by ? nombrePorId.get(a.created_by) ?? null : null,
      taskId: a.task_id,
    }));

    return { actividades, error: false };
  } catch {
    return { actividades: [], error: true };
  }
}
