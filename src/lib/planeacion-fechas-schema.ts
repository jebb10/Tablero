import { z } from "zod";

// Unidad C1.2 — validación de la tabla editable de fechas planeadas.
// inicio/fin viajan como "YYYY-MM-DD" (o "" -> null) desde <input type="date">.
export const filaFechaSchema = z
  .object({
    id: z.string().uuid(),
    inicio: z.string().nullable(),
    fin: z.string().nullable(),
  })
  .superRefine((f, ctx) => {
    if ((f.inicio === null) !== (f.fin === null)) {
      ctx.addIssue({ code: "custom", message: "Ambas fechas o ninguna." });
    }
  })
  .refine((f) => !f.inicio || !f.fin || f.fin >= f.inicio, {
    message: "La fecha de fin no puede ser anterior al inicio.",
  });

export const filasFechaSchema = z.array(filaFechaSchema);

export type FilaFecha = z.infer<typeof filaFechaSchema>;
