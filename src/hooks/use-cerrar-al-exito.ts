"use client";

import { useState } from "react";

/** Cierra un diálogo/formulario apenas una Server Action reporta éxito,
 * ajustando estado durante el render (mismo patrón que React recomienda
 * para "adjust state when a prop changes" -- no useEffect). */
export function useCerrarAlExito(success: boolean, cerrar: () => void) {
  const [successVisto, setSuccessVisto] = useState(success);
  if (success !== successVisto) {
    setSuccessVisto(success);
    if (success) cerrar();
  }
}
