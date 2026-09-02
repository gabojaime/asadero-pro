import { describe, expect, it } from "vitest";
import {
  parseCreateStaffUserInput,
  parseSignInCredentials,
} from "./validations";

describe("parseSignInCredentials", () => {
  it("rejects empty email and password", () => {
    const result = parseSignInCredentials({ email: "", password: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.email).toBeDefined();
      expect(result.fieldErrors.password).toBeDefined();
    }
  });

  it("trims email before validation", () => {
    const result = parseSignInCredentials({
      email: "  chef@asadero.pro  ",
      password: "secret123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("chef@asadero.pro");
    }
  });

  it("rejects password shorter than 6 characters", () => {
    const result = parseSignInCredentials({
      email: "chef@asadero.pro",
      password: "12345",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.password).toBeDefined();
    }
  });
});

describe("parseCreateStaffUserInput", () => {
  const validInput = {
    email: "staff@asadero.pro",
    password: "secret123",
    fullName: "Carlos Ruiz",
    role: "waiter" as const,
  };

  it("accepts valid staff input", () => {
    const result = parseCreateStaffUserInput(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Carlos Ruiz");
      expect(result.data.role).toBe("waiter");
    }
  });

  it("rejects invalid role enum", () => {
    const result = parseCreateStaffUserInput({
      ...validInput,
      role: "manager" as "waiter",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.role).toBeDefined();
    }
  });

  it("rejects empty full name", () => {
    const result = parseCreateStaffUserInput({
      ...validInput,
      fullName: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.fullName).toBeDefined();
    }
  });

  it("rejects password longer than 72 characters", () => {
    const result = parseCreateStaffUserInput({
      ...validInput,
      password: "a".repeat(73),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.password).toBeDefined();
    }
  });
});
