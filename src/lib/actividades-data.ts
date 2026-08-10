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
}

export async function getActividades(requirementId: string): Promise<{
  actividades: Actividad[];
  error: boolean;
}> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, event_type, title, notes, hours_spent, logged_at, created_by")
      .eq("requirement_id", requirementId)
      .order("logged_at", { ascending: false });
    if (error) throw error;

    // No hay FK directa activity_logs -> profiles (created_by referencia
    // auth.users), así que PostgREST no puede embeber el join: se resuelve
    // el nombre del autor con una segunda consulta. Si RLS no deja leer el
    // profile de otro usuario (Viewer viendo una entrada de un Admin), esa
    // fila simplemente no aparece y el autor cae al fallback "—".
    const idsAutores = Array.from(
      new Set((data ?? []).map((a) => a.created_by).filter((id): id is string => id !== null))
    );
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", idsAutores.length > 0 ? idsAutores : [""]);
    const nombrePorId = new Map((perfiles ?? []).map((p) => [p.user_id, p.full_name]));

    const actividades: Actividad[] = (data ?? []).map((a) => ({
      id: a.id,
      eventType: a.event_type,
      title: a.title,
      notes: a.notes,
      hoursSpent: a.hours_spent,
      loggedAt: new Date(a.logged_at),
      autor: a.created_by ? nombrePorId.get(a.created_by) ?? null : null,
    }));

    return { actividades, error: false };
  } catch {
    return { actividades: [], error: true };
  }
}
