"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ESTADOS_DB, ESTADO_DB_A_ES } from "@/lib/estados";
import { slugify } from "@/lib/slug";
import { categoryFromCode } from "@/lib/category";
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
  billing_date: string | null;
  notes: string | null;
  dev_environment_url: string | null;
  has_detail_tracking: boolean;
  parent_requirement_id: string | null;
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
          <select
            id="status"
            name="status"
            defaultValue={valoresIniciales?.status ?? "NO_INICIADO"}
            className="h-9 rounded-md border bg-transparent px-2.5 text-sm"
          >
            {ESTADOS_DB.map((s) => (
              <option key={s} value={s}>
                {ESTADO_DB_A_ES[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadline">Fecha límite</Label>
          <Input id="deadline" name="deadline" type="date" defaultValue={valoresIniciales?.deadline ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedHours">Horas estimadas</Label>
          <Input
            id="estimatedHours"
            name="estimatedHours"
            type="number"
            step="0.5"
            min="0"
            defaultValue={valoresIniciales?.estimated_hours ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billingDate">Fecha de cobro</Label>
        <Input id="billingDate" name="billingDate" defaultValue={valoresIniciales?.billing_date ?? ""} />
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
        <input
          type="checkbox"
          name="hasDetailTracking"
          defaultChecked={valoresIniciales?.has_detail_tracking ?? false}
          className="h-4 w-4"
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
