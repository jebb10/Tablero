"use client";

import { useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reintentar } from "@/app/actions/ui";

export function ErrorDatosBanner({ soloBanner }: { soloBanner?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-destructive">
        No se pudo consultar la base de datos.
        {!soloBanner && " Mostrando la última lectura correcta."}
      </p>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={() => startTransition(() => reintentar())}
      >
        Reintentar
      </Button>
    </div>
  );
}
