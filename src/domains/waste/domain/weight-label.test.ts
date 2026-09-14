import { describe, expect, it } from "vitest";
import { parseWeightLabelToKg } from "./weight-label";

describe("parseWeightLabelToKg", () => {
  it("parses supported weight labels", () => {
    expect(parseWeightLabelToKg("1kg")).toBe(1);
    expect(parseWeightLabelToKg("500g")).toBe(0.5);
    expect(parseWeightLabelToKg("250g")).toBe(0.25);
  });

  it("returns null for missing or unknown labels", () => {
    expect(parseWeightLabelToKg(null)).toBeNull();
    expect(parseWeightLabelToKg(undefined)).toBeNull();
    expect(parseWeightLabelToKg("")).toBeNull();
    expect(parseWeightLabelToKg("2kg")).toBeNull();
  });
});
