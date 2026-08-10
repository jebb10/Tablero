export const TIPOS_ACTIVIDAD_VALIDOS = [
  "SEGUIMIENTO",
  "PRESENTACION_FLUJO",
  "GESTION_DOCUMENTAL",
  "REFINAMIENTO_TECNICO",
  "OTRO",
] as const;

export const TIPO_ACTIVIDAD_LABEL: Record<string, string> = {
  SEGUIMIENTO: "Seguimiento",
  PRESENTACION_FLUJO: "Presentación de flujo",
  GESTION_DOCUMENTAL: "Gestión documental",
  REFINAMIENTO_TECNICO: "Refinamiento técnico",
  OTRO: "Otro",
};
