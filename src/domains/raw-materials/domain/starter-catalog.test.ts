import { describe, expect, it } from "vitest";
import { STARTER_RAW_MATERIALS } from "./starter-catalog";

describe("STARTER_RAW_MATERIALS", () => {
  it("defines 18 floor catalog items", () => {
    expect(STARTER_RAW_MATERIALS).toHaveLength(18);
  });

  it("uses unique normalized names", () => {
    const normalized = STARTER_RAW_MATERIALS.map((item) =>
      item.name.trim().toLowerCase(),
    );
    expect(new Set(normalized).size).toBe(normalized.length);
  });
});
