"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HorasPdfReport } from "@/components/horas-pdf-report";
import type { Estado } from "@/lib/types";
import type { FilaHoras } from "@/lib/horas-reporte";

const BLOQUES: { estado: Estado; etiqueta: string }[] = [
  { estado: "En curso", etiqueta: "En curso" },
  { estado: "Pausado", etiqueta: "Pausados" },
  { estado: "No iniciado", etiqueta: "No iniciados" },
  { estado: "Entregado en producción", etiqueta: "Entregados en producción" },
  { estado: "Cerrado por cambio de alcance", etiqueta: "Cerrados por cambio de alcance" },
];

const th = "px-3 py-2 text-left text-xs font-semibold text-muted-foreground";
const td = "px-3 py-2 text-sm";

export function HorasClient({ filas }: { filas: FilaHoras[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <FileDown />
          Exportar PDF
        </Button>
      </div>

      <div className="flex flex-col gap-6 print:hidden">
        {BLOQUES.map(({ estado, etiqueta }) => {
          const items = filas.filter((f) => f.estado === estado);
          if (items.length === 0) return null;
          return (
            <section key={estado} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border">
                <div className="bg-muted px-4 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {etiqueta} ({items.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className={th}>Requerimiento</th>
                        <th className={th}>Requerimientos</th>
                        <th className={th}>Diseño</th>
                        <th className={th}>Desarrollo</th>
                        <th className={th}>Total estimado</th>
                        <th className={th}>Horas ejecutadas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((f) => (
                        <tr key={f.item}>
                          <td className={td}>
                            <Link href={`/requerimiento/${f.slug}`} className="hover:underline">
                              {f.nombre}
                            </Link>
                            <span className="ml-1.5 text-xs text-muted-foreground">{f.item}</span>
                          </td>
                          <td className={td}>{f.horasFaseRequerimientos}h</td>
                          <td className={td}>{f.horasFaseDiseno}h</td>
                          <td className={td}>{f.horasFaseDesarrollo}h</td>
                          <td className={`${td} font-medium`}>{f.horasEstimadasTotal}h</td>
                          <td className={td}>{f.horasEjecutadas}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <HorasPdfReport filas={filas} />
    </div>
  );
}
