import type { Semaforo } from "./semaforo";

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
  fechaCobro: string | null;
  notas: string | null;
  bloqueado: boolean;
  tieneDetalle: boolean;
  sinTareas: boolean;
  fechaLimite: Date | null;
  semaforo: Semaforo;
  reabierto: number;
  faseActual: string | null;
}

export interface CalidadDatos {
  camposFaltantes: number;
  requerimientosAfectados: number;
  filas: { req: string; campo: string }[];
}

export type SaludProyecto = "verde" | "amarillo" | "rojo";

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
  calidad: CalidadDatos;
  reabiertos: number;
  vencidas: number;
  entregasIncumplidas: number;
  salud: SaludProyecto;
}

export interface Tarea {
  tarea: string;
  detalle: string | null;
  estado: string | null;
  horas: number | null;
  fechaLimite: Date | null;
  fechaReal: Date | null;
  hito: string | null;
  notas: string | null;
  bloqueantes: string | null;
  asignado: string | null;
}

export type EstadoFase = "completada" | "en-curso" | "pendiente";

export interface Fase {
  nombre: string;
  horasEstimadas: number | null;
  tareas: Tarea[];
  estado: EstadoFase;
}
