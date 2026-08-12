"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_DB, ESTADO_DB_A_ES } from "@/lib/estados";
import { slugify } from "@/lib/slug";
import { categoryFromCode } from "@/lib/category";
import { FASES_ORDEN } from "@/lib/fases-orden";
import type { GuardarRequerimientoState } from "@/app/actions/requirements";

export interface RequerimientoFormValores {
  code: string;
  title: string;
  category: string | null;
  complexity: string | null;
  month_label: string | null;
  status: string;
  deadline: string | null;
  estimated_hours: number | null;
  notes: string | null;
  dev_environment_url: string | null;
  has_detail_tracking: boolean;
  parent_requirement_id: string | null;
  /** Horas estimadas manuales por fase (2026-08-12), clave = phase_number. */
  phaseEstimatedHours?: Map<number, number>;
}

const ESTADO_INICIAL: GuardarRequerimientoState = { error: null, success: false };

export function RequerimientoForm({
  action,
  valoresIniciales,
  textoBotonGuardar,
}: {
  action: (state: GuardarRequerimientoState, formData: FormData) => Promise<GuardarRequerimientoState>;
  valoresIniciales?: RequerimientoFormValores;
  textoBotonGuardar: string;
}) {
  const [state, formAction, pending] = useActionState(action, ESTADO_INICIAL);
  const [code, setCode] = useState(valoresIniciales?.code ?? "");
  const [category, setCategory] = useState(valoresIniciales?.category ?? "");
  const [slug, setSlug] = useState(valoresIniciales ? "" : slugify(code));
  const [editandoSlug, setEditandoSlug] = useState(false);
  const [horasEstimadasTotal, setHorasEstimadasTotal] = useState(
    valoresIniciales?.estimated_hours ?? 0
  );
  const [horasPorFase, setHorasPorFase] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      FASES_ORDEN.map((f) => [
        f.numero,
        String(valoresIniciales?.phaseEstimatedHours?.get(f.numero) ?? ""),
      ])
    )
  );
  const sumaHorasPorFase = Object.values(horasPorFase).reduce(
    (acc, v) => acc + (v.trim() ? Number(v) : 0),
    0
  );

  function onCodeChange(value: string) {
    setCode(value);
    if (!valoresIniciales) {
      setSlug(slugify(value));
      if (!category) setCategory(categoryFromCode(value) ?? "");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código</Label>
          <Input id="code" name="code" value={code} onChange={(e) => onCodeChange(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" defaultValue={valoresIniciales?.title} required />
        </div>
      </div>

      {!valoresIniciales && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <div className="flex gap-2">
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              readOnly={!editandoSlug}
              className={!editandoSlug ? "text-muted-foreground" : undefined}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => setEditandoSlug(true)}>
              Editar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Se deriva del código. Solo edítalo a mano si choca con uno existente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Categoría</Label>
          <Input
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Sugerida desde el código"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="complexity">Complejidad</Label>
          <Input id="complexity" name="complexity" defaultValue={valoresIniciales?.complexity ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="monthLabel">Mes</Label>
          <Input id="monthLabel" name="monthLabel" defaultValue={valoresIniciales?.month_label ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" defaultValue={valoresIniciales?.status ?? "NO_INICIADO"}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_DB.map((s) => (
                <SelectItem key={s} value={s}>
                  {ESTADO_DB_A_ES[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadline">Fecha límite</Label>
          <Input id="deadline" name="deadline" type="date" defaultValue={valoresIniciales?.deadline ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedHours">Horas estimadas (Total)</Label>
          <Input
            id="estimatedHours"
            name="estimatedHours"
            type="number"
            step="0.5"
            min="0"
            value={horasEstimadasTotal}
            onChange={(e) => setHorasEstimadasTotal(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <p className="text-sm font-medium">Horas estimadas por fase (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Independiente del total de arriba — no es obligatorio que la suma coincida.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FASES_ORDEN.map((f) => (
            <div key={f.numero} className="flex flex-col gap-1.5">
              <Label htmlFor={`phaseEstimatedHours_${f.numero}`}>{f.nombre}</Label>
              <Input
                id={`phaseEstimatedHours_${f.numero}`}
                name={`phaseEstimatedHours_${f.numero}`}
                type="number"
                step="0.5"
                min="0"
                value={horasPorFase[f.numero]}
                onChange={(e) =>
                  setHorasPorFase((prev) => ({ ...prev, [f.numero]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Suma de fases: {sumaHorasPorFase}h de {horasEstimadasTotal}h totales
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="devEnvironmentUrl">Link de desarrollo</Label>
        <Input
          id="devEnvironmentUrl"
          name="devEnvironmentUrl"
          type="url"
          defaultValue={valoresIniciales?.dev_environment_url ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" defaultValue={valoresIniciales?.notes ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="parentRequirementId">ID del requerimiento padre (opcional)</Label>
        <Input
          id="parentRequirementId"
          name="parentRequirementId"
          defaultValue={valoresIniciales?.parent_requirement_id ?? ""}
          placeholder="Solo para requerimientos creados por cambio de alcance"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="hasDetailTracking"
          defaultChecked={valoresIniciales?.has_detail_tracking ?? false}
        />
        Seguimiento de tareas por fase
      </label>

      {state.error && <p className="text-sm text-status-bloqueo">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending && <Spinner />}
        {textoBotonGuardar}
      </Button>
    </form>
  );
}
