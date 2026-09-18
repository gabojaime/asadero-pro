import { describe, expect, it } from "vitest";
import {
  STARTER_MENU_ITEM_NAMES_FROM_SQL,
  STARTER_MENU_ITEMS,
  normalizeMenuItemName,
} from "./starter-catalog";

describe("STARTER_MENU_ITEMS", () => {
  it("defines 14 floor catalog items", () => {
    expect(STARTER_MENU_ITEMS).toHaveLength(14);
  });

  it("uses unique normalized names", () => {
    const normalized = STARTER_MENU_ITEMS.map((item) =>
      normalizeMenuItemName(item.name),
    );
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("matches SQL seed name list", () => {
    const names = STARTER_MENU_ITEMS.map((item) => item.name).sort();
    const expected = [...STARTER_MENU_ITEM_NAMES_FROM_SQL].sort();
    expect(names).toEqual(expected);
  });
});
