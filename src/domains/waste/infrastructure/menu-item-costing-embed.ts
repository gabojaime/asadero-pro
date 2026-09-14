export type MenuItemCostingEmbed =
  | { waste_pct: number | string | null }
  | Array<{ waste_pct: number | string | null }>
  | null
  | undefined;

/**
 * PostgREST returns one-to-one embeds as an object; optional many-side embeds as arrays.
 */
export function readWastePctFromEmbed(
  embed: MenuItemCostingEmbed,
): number | null {
  if (embed == null) {
    return null;
  }

  const wastePct = Array.isArray(embed) ? embed[0]?.waste_pct : embed.waste_pct;

  if (wastePct == null || wastePct === "") {
    return null;
  }

  const numeric = Number(wastePct);
  return Number.isFinite(numeric) ? numeric : null;
}
