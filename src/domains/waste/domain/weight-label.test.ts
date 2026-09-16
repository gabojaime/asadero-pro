import { describe, expect, it } from "vitest";
import { parseWeightLabelToKg } from "./weight-label";

describe("parseWeightLabelToKg", () => {
  it("parses legacy catalog weight labels", () => {
    expect(parseWeightLabelToKg("1kg")).toBe(1);
    expect(parseWeightLabelToKg("500g")).toBe(0.5);
    expect(parseWeightLabelToKg("250g")).toBe(0.25);
  });

  it("parses free-form gram and kilogram portions", () => {
    expect(parseWeightLabelToKg("300g")).toBe(0.3);
    expect(parseWeightLabelToKg("350g")).toBe(0.35);
    expect(parseWeightLabelToKg("1.2kg")).toBe(1.2);
    expect(parseWeightLabelToKg("2kg")).toBe(2);
    expect(parseWeightLabelToKg(" 300 g ")).toBe(0.3);
    expect(parseWeightLabelToKg("1.2 kg")).toBe(1.2);
  });

  it("returns null for missing, zero, or unknown labels", () => {
    expect(parseWeightLabelToKg(null)).toBeNull();
    expect(parseWeightLabelToKg(undefined)).toBeNull();
    expect(parseWeightLabelToKg("")).toBeNull();
    expect(parseWeightLabelToKg("0g")).toBeNull();
    expect(parseWeightLabelToKg("300")).toBeNull();
    expect(parseWeightLabelToKg("abc")).toBeNull();
  });
});
