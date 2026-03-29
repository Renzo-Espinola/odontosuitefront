// src/lib/labels.ts

export const MOVEMENT_CONCEPT_LABEL: Record<string, string> = {
  CONSULTATION: "Consulta",
  CLEANING: "Limpieza / Profilaxis",
  FILLING: "Restauración",
  ROOT_CANAL: "Endodoncia",
  EXTRACTION: "Extracción",
  ORTHODONTICS: "Ortodoncia",
  PROSTHESIS: "Prótesis",
  WHITENING: "Blanqueamiento",
  CONTROL_VISIT: "Consulta / Control",
  OTHER_INCOME: "Otro ingreso",

  MATERIALS: "Materiales",
  LABORATORY: "Laboratorio",
  SUPPLIERS: "Proveedores",
  RENT: "Alquiler",
  SERVICES: "Servicios",
  SALARIES: "Sueldos",
  TAXES: "Impuestos",
  MAINTENANCE: "Mantenimiento",
  OTHER_EXPENSE: "Otro egreso",
}

export function conceptLabel(concept?: string | null) {
  if (!concept) return "-"
  return MOVEMENT_CONCEPT_LABEL[concept] ?? concept
}
