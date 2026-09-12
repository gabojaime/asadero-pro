import { describe, expect, it } from "vitest";
import {
  formatMoneyUsdEs,
  parseMoneyInputEs,
  toEditableMoneyAmount,
} from "./format-money";

describe("formatMoneyUsdEs", () => {
  it("formats amounts with es-ES USD locale", () => {
    expect(formatMoneyUsdEs(24)).toMatch(/24,00\s*US\$/);
    expect(formatMoneyUsdEs(4.5)).toMatch(/4,50\s*US\$/);
  });
});

describe("parseMoneyInputEs", () => {
  it("returns 0 for empty or whitespace input", () => {
    expect(parseMoneyInputEs("")).toBe(0);
    expect(parseMoneyInputEs("   ")).toBe(0);
  });

  it("parses integer amounts without leading-zero artifacts", () => {
    expect(parseMoneyInputEs("37")).toBe(37);
    expect(parseMoneyInputEs("0")).toBe(0);
  });

  it("accepts comma or dot as decimal separator", () => {
    expect(parseMoneyInputEs("4,5")).toBe(4.5);
    expect(parseMoneyInputEs("4.5")).toBe(4.5);
  });

  it("parses es-ES grouped currency strings", () => {
    expect(parseMoneyInputEs("1.234,56")).toBe(1234.56);
  });

  it("ignores currency symbols and spaces", () => {
    expect(parseMoneyInputEs("  37,00 US$  ")).toBe(37);
  });

  it("clamps invalid or negative values to 0", () => {
    expect(parseMoneyInputEs("-5")).toBe(0);
    expect(parseMoneyInputEs("abc")).toBe(0);
  });
});

describe("toEditableMoneyAmount", () => {
  it("returns empty string for zero or negative amounts", () => {
    expect(toEditableMoneyAmount(0)).toBe("");
    expect(toEditableMoneyAmount(-1)).toBe("");
  });

  it("uses comma as decimal separator for editing", () => {
    expect(toEditableMoneyAmount(4.5)).toBe("4,5");
    expect(toEditableMoneyAmount(37)).toBe("37");
  });
});
