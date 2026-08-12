"use client";

import { useEffect, useRef } from "react";

/** Cierra un diálogo/formulario apenas una Server Action reporta éxito.
 * `cerrar` puede pertenecer a un componente ancestro (ej. `TareaAccionesAdmin`
 * decidiendo si renderiza `EditarTareaForm`), así que debe llamarse desde un
 * efecto -- invocarlo durante el render viola la regla de React de no
 * actualizar el estado de un componente distinto mientras se renderiza otro.
 * El efecto solo depende de `success` (no de `cerrar`) para disparar
 * exactamente una vez por transición false→true, igual que el patrón
 * anterior -- si dependiera de `cerrar` (identidad nueva en cada render de
 * quien la pasa inline) se re-cerraría el diálogo aunque el usuario ya lo
 * hubiera vuelto a abrir manualmente. */
export function useCerrarAlExito(success: boolean, cerrar: () => void) {
  const cerrarRef = useRef(cerrar);
  useEffect(() => {
    cerrarRef.current = cerrar;
  });

  useEffect(() => {
    if (success) cerrarRef.current();
  }, [success]);
}
