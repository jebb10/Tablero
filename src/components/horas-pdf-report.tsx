import type { Estado } from "@/lib/types";
import type { FilaHoras } from "@/lib/horas-reporte";

const BLOQUES: { estado: Estado; etiqueta: string }[] = [
  { estado: "En curso", etiqueta: "En curso" },
  { estado: "Pausado", etiqueta: "Pausados" },
  { estado: "No iniciado", etiqueta: "No iniciados" },
  { estado: "Entregado en producción", etiqueta: "Entregados en producción" },
  { estado: "Cerrado por cambio de alcance", etiqueta: "Cerrados por cambio de alcance" },
];

function formatearGeneracion(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

const th = "border border-[#999] px-2 py-1.5 text-left font-bold";
const td = "border border-[#999] px-2 py-1.5";

export function HorasPdfReport({ filas }: { filas: FilaHoras[] }) {
  return (
    <div className="hidden print:block text-black">
      <div className="mb-4 flex items-baseline justify-between border-b-[3px] border-[#FF7500] pb-3">
        <h1 className="text-lg font-bold text-[#003145]">
          Positiva — Horas ejecutadas / estimadas
        </h1>
        <span className="text-[11px] text-[#444]">
          Generado: {formatearGeneracion(new Date())}
        </span>
      </div>

      {BLOQUES.map(({ estado, etiqueta }) => {
        const items = filas.filter((f) => f.estado === estado);
        if (items.length === 0) return null;
        return (
          <div key={estado} className="mb-[18px]">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#003145]">
              {etiqueta}
            </p>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className={th}>Item</th>
                  <th className={th}>Requerimiento</th>
                  <th className={th}>Requerimientos</th>
                  <th className={th}>Diseño</th>
                  <th className={th}>Desarrollo</th>
                  <th className={th}>Total estimado</th>
                  <th className={th}>Horas ejecutadas</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.item}>
                    <td className={td}>{f.item}</td>
                    <td className={td}>{f.nombre}</td>
                    <td className={td}>{f.horasFaseRequerimientos}h</td>
                    <td className={td}>{f.horasFaseDiseno}h</td>
                    <td className={td}>{f.horasFaseDesarrollo}h</td>
                    <td className={td}>{f.horasEstimadasTotal}h</td>
                    <td className={td}>{f.horasEjecutadas}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="flex justify-between border-t border-[#ccc] pt-2 text-[10px] text-[#666]">
        <span>Positiva</span>
      </div>
    </div>
  );
}
