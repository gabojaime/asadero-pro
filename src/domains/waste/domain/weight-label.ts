const WEIGHT_LABEL_TO_KG: Record<string, number> = {
  "1kg": 1,
  "500g": 0.5,
  "250g": 0.25,
};

export function parseWeightLabelToKg(
  weightLabel: string | null | undefined,
): number | null {
  if (weightLabel == null) {
    return null;
  }

  const normalized = weightLabel.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return WEIGHT_LABEL_TO_KG[normalized] ?? null;
}
