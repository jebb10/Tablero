import { z } from "zod";

export const registrarHorasSchema = z.object({
  hoursSpent: z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v > 0, "Las horas deben ser un número mayor a cero."),
  notes: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  loggedAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), {
      message: "La fecha no es válida.",
    }),
});
