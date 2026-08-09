"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { recuperarAction, type RecuperarState } from "@/app/login/recuperar/actions";

const ESTADO_INICIAL: RecuperarState = { sent: false };

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState(recuperarAction, ESTADO_INICIAL);

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10">
          <Check className="size-6 text-success-text" />
        </span>
        <h1 className="text-xl font-bold text-foreground">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Si el correo existe, te enviamos un enlace para restablecer tu contraseña.
        </p>
        <Link
          href="/login"
          className="text-[13px] font-semibold text-primary hover:underline"
        >
          ← Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold text-foreground">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo y te enviaremos un enlace.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nombre@positiva.gov.co"
            autoComplete="email"
            required
          />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Spinner />}
          Enviar enlace
        </Button>

        <Link
          href="/login"
          className="text-center text-[13px] text-muted-foreground hover:text-foreground"
        >
          ← Volver a iniciar sesión
        </Link>
      </form>
    </div>
  );
}
