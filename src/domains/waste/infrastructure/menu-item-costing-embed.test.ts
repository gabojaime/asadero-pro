import { describe, expect, it } from "vitest";
import { readWastePctFromEmbed } from "./menu-item-costing-embed";

describe("readWastePctFromEmbed", () => {
  it("reads waste_pct from a one-to-one object embed", () => {
    expect(readWastePctFromEmbed({ waste_pct: 30 })).toBe(30);
  });

  it("reads waste_pct from an array embed", () => {
    expect(readWastePctFromEmbed([{ waste_pct: 25 }])).toBe(25);
  });

  it("coerces decimal strings from PostgREST", () => {
    expect(readWastePctFromEmbed({ waste_pct: "10.5" })).toBe(10.5);
  });

  it("returns null when embed is missing or empty", () => {
    expect(readWastePctFromEmbed(null)).toBeNull();
    expect(readWastePctFromEmbed(undefined)).toBeNull();
    expect(readWastePctFromEmbed([])).toBeNull();
    expect(readWastePctFromEmbed({ waste_pct: null })).toBeNull();
  });
});
