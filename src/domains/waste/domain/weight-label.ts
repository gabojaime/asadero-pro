const WEIGHT_LABEL_TO_KG: Record<string, number> = {
  "1kg": 1,
  "500g": 0.5,
  "250g": 0.25,
};

const GRAMS_PATTERN = /^(\d+(?:\.\d+)?)g$/;
const KILOGRAMS_PATTERN = /^(\d+(?:\.\d+)?)kg$/;

function normalizeWeightLabel(weightLabel: string): string {
  return weightLabel.trim().toLowerCase().replace(/\s+/g, "");
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parseWeightLabelToKg(
  weightLabel: string | null | undefined,
): number | null {
  if (weightLabel == null) {
    return null;
  }

  const normalized = normalizeWeightLabel(weightLabel);
  if (!normalized) {
    return null;
  }

  const legacyKg = WEIGHT_LABEL_TO_KG[normalized];
  if (legacyKg != null) {
    return legacyKg;
  }

  const gramsMatch = normalized.match(GRAMS_PATTERN);
  if (gramsMatch) {
    const grams = parsePositiveNumber(gramsMatch[1]);
    return grams == null ? null : grams / 1000;
  }

  const kilogramsMatch = normalized.match(KILOGRAMS_PATTERN);
  if (kilogramsMatch) {
    return parsePositiveNumber(kilogramsMatch[1]);
  }

  return null;
}
