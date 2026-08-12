import type { Semaforo } from "./semaforo";
import type { EstadoTarea } from "./estados-tarea";

export type Estado =
  | "En curso"
  | "Pausado"
  | "No iniciado"
  | "Entregado en producción"
  | "Cerrado por cambio de alcance";

export interface Requerimiento {
  item: string;
  slug: string;
  nombre: string;
  estado: Estado;
  mes: string | null;
  complejidad: string | null;
  horasEstimadas: number | null;
  horasEjecutadas: number | null;
  horasPorEjecutar: number | null;
  porcentajeAvance: number | null;
  overbudget: boolean;
  tieneDetalle: boolean;
  sinTareas: boolean;
  fechaLimite: Date | null;
  semaforo: Semaforo;
  reabierto: number;
  faseActual: string | null;
  tieneTareaBloqueda: boolean;
  proximaActividadFecha: Date | null;
}

export interface HitoProximo {
  nombre: string;
  requerimientoCodigo: string;
  requerimientoNombre: string;
  requerimientoSlug: string;
  fecha: Date | null;
}

export interface KPIs {
  total: number;
  porEstado: Record<Estado, number>;
  horasEstimadasTotal: number;
  horasEjecutadasTotal: number;
  bloqueados: number;
  reabiertos: number;
}

export interface Tarea {
  id: string;
  tarea: string;
  detalle: string | null;
  estado: EstadoTarea | null;
  horas: number | null;
  fechaLimite: Date | null;
  hito: string | null;
  notas: string | null;
  bloqueantes: string | null;
  asignado: string | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  plannedDatesConfirmed: boolean;
  executedHours: number;
}

export type EstadoFase = "completada" | "en-curso" | "pendiente";

export interface Fase {
  nombre: string;
  horasEstimadas: number | null;
  tareas: Tarea[];
  estado: EstadoFase;
  fechaLimiteFase: Date | null;
}
