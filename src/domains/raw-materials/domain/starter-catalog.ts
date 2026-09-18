import type { UnitOfMeasure } from "./entities";

/** Floor catalog for new merchants — keep in sync with supabase/seeds/dev_raw_materials.sql */
export type StarterRawMaterialDefinition = {
  name: string;
  unitOfMeasure: UnitOfMeasure;
};

export const STARTER_RAW_MATERIALS: readonly StarterRawMaterialDefinition[] = [
  { name: "Carne", unitOfMeasure: "kilogram" },
  { name: "Pollo", unitOfMeasure: "kilogram" },
  { name: "Cochino", unitOfMeasure: "kilogram" },
  { name: "Sal gruesa", unitOfMeasure: "kilogram" },
  { name: "Pimienta", unitOfMeasure: "kilogram" },
  { name: "Envases", unitOfMeasure: "unit" },
  { name: "Bolsas", unitOfMeasure: "unit" },
  { name: "Cubiertos", unitOfMeasure: "unit" },
  { name: "Toallin", unitOfMeasure: "unit" },
  { name: "Guantes", unitOfMeasure: "unit" },
  { name: "Carbón", unitOfMeasure: "kilogram" },
  { name: "Aceite", unitOfMeasure: "kilogram" },
  { name: "Cubito", unitOfMeasure: "unit" },
  { name: "Verduras", unitOfMeasure: "kilogram" },
  { name: "Mostaza", unitOfMeasure: "kilogram" },
  { name: "Mayonesa", unitOfMeasure: "kilogram" },
  { name: "Miel", unitOfMeasure: "kilogram" },
  { name: "Papel aluminio", unitOfMeasure: "unit" },
] as const;

export function normalizeRawMaterialName(name: string): string {
  return name.trim().toLowerCase();
}
