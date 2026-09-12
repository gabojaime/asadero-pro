const usdEsFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
});

export function formatMoneyUsdEs(amount: number): string {
  return usdEsFormatter.format(amount);
}

/** Strip currency symbols and grouping; keep digits and decimal separators. */
function sanitizeMoneyInput(raw: string): string {
  return raw.trim().replace(/[^\d,.-]/g, "");
}

/**
 * Parses waiter-entered money text (es-ES friendly: comma decimal, optional dot).
 * Returns a non-negative finite number; empty input becomes 0.
 */
export function parseMoneyInputEs(raw: string): number {
  const cleaned = sanitizeMoneyInput(raw);
  if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") {
    return 0;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned.replace(/,/g, "").replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

/** Raw editable text when focusing a formatted money field. */
export function toEditableMoneyAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  return String(amount).replace(".", ",");
}
