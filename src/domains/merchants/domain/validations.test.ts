import { describe, expect, it } from "vitest";
import { validateOnboardingInput } from "./validations";

describe("validateOnboardingInput", () => {
  it("rejects empty required fields", () => {
    const result = validateOnboardingInput({
      merchantName: "",
      ownerFullName: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.merchantName).toBeDefined();
      expect(result.fieldErrors.ownerFullName).toBeDefined();
    }
  });

  it("rejects whitespace-only required fields", () => {
    const result = validateOnboardingInput({
      merchantName: "   ",
      ownerFullName: "  ",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid input with optional fields omitted", () => {
    const result = validateOnboardingInput({
      merchantName: "Asadero Central",
      ownerFullName: "Maria Lopez",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.merchantName).toBe("Asadero Central");
      expect(result.data.ownerFullName).toBe("Maria Lopez");
      expect(result.data.address).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });

  it("normalizes optional address and phone when provided", () => {
    const result = validateOnboardingInput({
      merchantName: "Asadero Central",
      ownerFullName: "Maria Lopez",
      address: " Calle 10 #5 ",
      phone: " 3001234567 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address).toBe("Calle 10 #5");
      expect(result.data.phone).toBe("3001234567");
    }
  });

  it("maps blank optional fields to null", () => {
    const result = validateOnboardingInput({
      merchantName: "Asadero Central",
      ownerFullName: "Maria Lopez",
      address: "   ",
      phone: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });

  it("rejects fields exceeding max length", () => {
    const tooLong = "a".repeat(256);
    const result = validateOnboardingInput({
      merchantName: tooLong,
      ownerFullName: tooLong,
      address: tooLong,
      phone: tooLong,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.merchantName).toBeDefined();
      expect(result.fieldErrors.ownerFullName).toBeDefined();
      expect(result.fieldErrors.address).toBeDefined();
      expect(result.fieldErrors.phone).toBeDefined();
    }
  });
});
