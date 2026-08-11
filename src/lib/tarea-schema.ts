import { z } from "zod";
import { ESTADOS_TAREA } from "@/lib/estados-tarea";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const crearTareaSchema = z.object({
  taskName: z.string().trim().min(1, "El nombre de la tarea es obligatorio."),
  dueDate: z.string().trim().min(1, "La fecha límite es obligatoria."),
  plannedStartDate: textoOpcional,
  plannedEndDate: textoOpcional,
  hoursSpent: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      message: "Las horas deben ser un número válido.",
    }),
});
export type CrearTareaInput = z.infer<typeof crearTareaSchema>;

export const actualizarEstadoTareaSchema = z.object({
  status: z.enum(ESTADOS_TAREA),
});

export const actualizarTareaSchema = z.object({
  taskName: z.string().trim().min(1, "El nombre de la tarea es obligatorio."),
  dueDate: z.string().trim().min(1, "La fecha límite es obligatoria."),
  notes: textoOpcional,
  blockers: textoOpcional,
  assignee: textoOpcional,
});

export const guardarFechaLimiteFaseSchema = z.object({
  dueDate: z.string().trim().min(1, "La fecha es obligatoria."),
});

export const eliminarTareaSchema = z.object({
  taskId: z.string().min(1, "Falta el identificador de la tarea."),
});
