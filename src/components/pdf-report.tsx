import type { Estado, KPIs, Requerimiento } from "@/lib/types";

const BLOQUES: { estado: Estado; etiqueta: string }[] = [
  { estado: "En curso", etiqueta: "En curso" },
  { estado: "Pausado", etiqueta: "Pausados" },
  { estado: "No iniciado", etiqueta: "No iniciados" },
  { estado: "Entregado en producción", etiqueta: "Entregados en producción" },
];

function formatearFecha(fecha: Date | null): string {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

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

export function PdfReport({
  requerimientos,
  kpis,
}: {
  requerimientos: Requerimiento[];
  kpis: KPIs;
}) {
  return (
    <div className="hidden print:block text-black">
      <div className="mb-4 flex items-baseline justify-between border-b-[3px] border-[#FF7500] pb-3">
        <h1 className="text-lg font-bold text-[#003145]">
          Dashboard 414 — Reporte de requerimientos
        </h1>
        <span className="text-[11px] text-[#444]">
          Generado: {formatearGeneracion(new Date())}
        </span>
      </div>

      <table className="mb-5 w-full border-collapse text-[11.5px]">
        <tbody>
          <tr>
            <td className={`${td} font-bold`}>Total</td>
            <td className={td}>{kpis.total}</td>
            <td className={`${td} font-bold`}>Horas ejec. / est.</td>
            <td className={td}>
              {kpis.horasEjecutadasTotal.toFixed(0)} / {kpis.horasEstimadasTotal.toFixed(0)}
            </td>
            <td className={`${td} font-bold`}>Bloqueados</td>
            <td className={td}>{kpis.bloqueados}</td>
          </tr>
        </tbody>
      </table>

      {BLOQUES.map(({ estado, etiqueta }) => {
        const items = requerimientos.filter((r) => r.estado === estado);
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
                  <th className={th}>Avance</th>
                  <th className={th}>Horas</th>
                  <th className={th}>Fecha límite</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.item}>
                    <td className={td}>{r.item}</td>
                    <td className={td}>{r.nombre}</td>
                    <td className={td}>
                      {r.tieneDetalle ? `${r.porcentajeAvance ?? 0}%` : "—"}
                    </td>
                    <td className={td}>
                      {r.horasEjecutadas ?? "—"}h / {r.horasEstimadas ?? "—"}h
                    </td>
                    <td className={td}>{formatearFecha(r.fechaLimite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="flex justify-between border-t border-[#ccc] pt-2 text-[10px] text-[#666]">
        <span>Dashboard 414 — Positiva</span>
      </div>
    </div>
  );
}
