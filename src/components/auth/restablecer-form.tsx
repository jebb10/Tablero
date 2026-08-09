"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { restablecerAction, type RestablecerState } from "@/app/login/restablecer/actions";

const ESTADO_INICIAL: RestablecerState = { error: null };

export function RestablecerForm() {
  const [state, formAction, pending] = useActionState(restablecerAction, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-xl font-bold text-foreground">Nueva contraseña</h1>

      <form action={formAction} className="flex flex-col gap-4">
        {state.error && <Alert variant="destructive">{state.error}</Alert>}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña nueva</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Spinner />}
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
