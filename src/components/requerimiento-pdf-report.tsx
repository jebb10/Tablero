import type { Fase } from "@/lib/types";
import { dbAEstado } from "@/lib/estados";
import { formatearFecha as formatearFechaBase } from "@/lib/fechas";
import type { RequerimientoDetalle } from "@/lib/requerimiento-data";

function formatearFecha(fecha: Date | null): string {
  return formatearFechaBase(fecha, { conAño: true }) ?? "—";
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

export function RequerimientoPdfReport({
  requerimiento,
  fases,
}: {
  requerimiento: RequerimientoDetalle;
  fases: Fase[];
}) {
  const horasEstimadas = requerimiento.estimated_hours;
  const horasEjecutadas = requerimiento.executed_hours;
  const horasRestantes =
    horasEstimadas !== null && horasEjecutadas !== null ? horasEstimadas - horasEjecutadas : null;

  return (
    <div className="hidden print:block text-black">
      <div className="mb-4 flex items-baseline justify-between border-b-[3px] border-[#FF7500] pb-3">
        <h1 className="text-lg font-bold text-[#003145]">
          Positiva — {requerimiento.title}
        </h1>
        <span className="text-[11px] text-[#444]">
          Generado: {formatearGeneracion(new Date())}
        </span>
      </div>

      <table className="mb-5 w-full border-collapse text-[11.5px]">
        <tbody>
          <tr>
            <td className={`${td} font-bold`}>Código</td>
            <td className={td}>{requerimiento.code}</td>
            <td className={`${td} font-bold`}>Estado</td>
            <td className={td}>{dbAEstado(requerimiento.status)}</td>
          </tr>
          <tr>
            <td className={`${td} font-bold`}>Horas estimadas</td>
            <td className={td}>{horasEstimadas ?? "—"}h</td>
            <td className={`${td} font-bold`}>Horas consumidas</td>
            <td className={td}>{horasEjecutadas ?? "—"}h</td>
          </tr>
          <tr>
            <td className={`${td} font-bold`}>Horas restantes</td>
            <td className={td} colSpan={3}>
              {horasRestantes ?? "—"}h
            </td>
          </tr>
        </tbody>
      </table>

      {fases.map((fase) => (
        <div key={fase.nombre} className="mb-[18px]">
          <p className="mb-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-wide text-[#003145]">
            <span>{fase.nombre}</span>
            <span className="font-normal normal-case text-[#444]">
              {fase.fechaLimiteFase && <>Fase límite: {formatearFecha(fase.fechaLimiteFase)} · </>}
              Estimadas: {fase.horasEstimadas ?? "—"}h · Consumidas: {fase.horasEjecutadas ?? 0}h
            </span>
          </p>
          {fase.tareas.length === 0 ? (
            <p className="text-[11px] text-[#666]">Sin tareas registradas en esta fase.</p>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className={th}>Tarea</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Horas consumidas</th>
                </tr>
              </thead>
              <tbody>
                {fase.tareas.map((tarea) => (
                  <tr key={tarea.id}>
                    <td className={td}>{tarea.tarea}</td>
                    <td className={td}>{tarea.estado ?? "—"}</td>
                    <td className={td}>{tarea.executedHours}h</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${td} font-bold`} colSpan={2}>
                    Subtotal fase
                  </td>
                  <td className={`${td} font-bold`}>{fase.horasEjecutadas ?? 0}h</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ))}

      <table className="w-full border-collapse text-[11.5px]">
        <tbody>
          <tr>
            <td className={`${td} font-bold`}>Total horas consumidas</td>
            <td className={td}>{horasEjecutadas ?? 0}h</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex justify-between border-t border-[#ccc] pt-2 text-[10px] text-[#666]">
        <span>Positiva</span>
      </div>
    </div>
  );
}
