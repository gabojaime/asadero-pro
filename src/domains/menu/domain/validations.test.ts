import { describe, expect, it } from "vitest";
import {
  assertKindFieldRules,
  parseCreateMenuItemInput,
  parseUpdateMenuItemInput,
  validateUpdateForKind,
} from "./validations";
import { MenuItemError } from "./errors";

describe("assertKindFieldRules", () => {
  it("requires protein and weight for meat plates", () => {
    expect(() =>
      assertKindFieldRules("meat_plate", null, "1kg"),
    ).toThrow(MenuItemError);
    expect(() =>
      assertKindFieldRules("meat_plate", "beef", null),
    ).toThrow(MenuItemError);
  });

  it("allows meat plate with protein and weight", () => {
    expect(() =>
      assertKindFieldRules("meat_plate", "beef", "1kg"),
    ).not.toThrow();
  });

  it("rejects drink with protein or weight", () => {
    expect(() =>
      assertKindFieldRules("drink", "beef", null),
    ).toThrow(MenuItemError);
    expect(() =>
      assertKindFieldRules("drink", null, "500g"),
    ).toThrow(MenuItemError);
  });

  it("rejects side with protein or weight", () => {
    expect(() =>
      assertKindFieldRules("side", "pork", null),
    ).toThrow(MenuItemError);
    expect(() =>
      assertKindFieldRules("side", null, "250g"),
    ).toThrow(MenuItemError);
  });
});

describe("parseCreateMenuItemInput", () => {
  it("accepts valid meat plate", () => {
    const result = parseCreateMenuItemInput({
      name: "  Costilla  ",
      price: 13.5,
      itemKind: "meat_plate",
      proteinGroup: "pork",
      weightLabel: "1kg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Costilla");
    }
  });

  it("accepts drink without protein or weight", () => {
    const result = parseCreateMenuItemInput({
      name: "Coca-Cola",
      price: 2,
      itemKind: "drink",
      proteinGroup: null,
      weightLabel: null,
    });

    expect(result.success).toBe(true);
  });

  it("accepts side with zero price", () => {
    const result = parseCreateMenuItemInput({
      name: "Yuca",
      price: 0,
      itemKind: "side",
      proteinGroup: null,
      weightLabel: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects meat plate missing protein or weight", () => {
    const missingProtein = parseCreateMenuItemInput({
      name: "Carne",
      price: 10,
      itemKind: "meat_plate",
      proteinGroup: null,
      weightLabel: "1kg",
    });
    expect(missingProtein.success).toBe(false);

    const missingWeight = parseCreateMenuItemInput({
      name: "Carne",
      price: 10,
      itemKind: "meat_plate",
      proteinGroup: "beef",
      weightLabel: null,
    });
    expect(missingWeight.success).toBe(false);
  });

  it("rejects drink with non-null protein or weight", () => {
    expect(
      parseCreateMenuItemInput({
        name: "Agua",
        price: 1,
        itemKind: "drink",
        proteinGroup: "beef",
        weightLabel: null,
      }).success,
    ).toBe(false);

    expect(
      parseCreateMenuItemInput({
        name: "Agua",
        price: 1,
        itemKind: "drink",
        proteinGroup: null,
        weightLabel: "1L",
      }).success,
    ).toBe(false);
  });

  it("rejects negative price", () => {
    const result = parseCreateMenuItemInput({
      name: "Item",
      price: -1,
      itemKind: "drink",
      proteinGroup: null,
      weightLabel: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.price).toBeDefined();
    }
  });
});

describe("parseUpdateMenuItemInput", () => {
  it("rejects negative price on update", () => {
    const result = parseUpdateMenuItemInput({
      name: "Item",
      price: -0.01,
      proteinGroup: null,
      weightLabel: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("validateUpdateForKind", () => {
  it("enforces meat plate fields on update", () => {
    const result = validateUpdateForKind("meat_plate", {
      name: "Carne",
      price: 12,
      proteinGroup: null,
      weightLabel: "500g",
    });

    expect(result.success).toBe(false);
  });
});
