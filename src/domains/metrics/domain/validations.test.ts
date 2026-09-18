import { describe, expect, it } from "vitest";
import {
  parseDashboardPeriod,
  updateDashboardSettingsSchema,
} from "./validations";

describe("parseDashboardPeriod", () => {
  it("defaults invalid values to last_7_days", () => {
    expect(parseDashboardPeriod(undefined)).toBe("last_7_days");
    expect(parseDashboardPeriod("invalid")).toBe("last_7_days");
  });

  it("accepts known period tokens", () => {
    expect(parseDashboardPeriod("today")).toBe("today");
    expect(parseDashboardPeriod("month_to_date")).toBe("month_to_date");
  });
});

describe("updateDashboardSettingsSchema", () => {
  it("allows null overhead and table count", () => {
    const parsed = updateDashboardSettingsSchema.safeParse({
      monthlyFixedOverhead: null,
      seatingTableCount: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects negative overhead", () => {
    const parsed = updateDashboardSettingsSchema.safeParse({
      monthlyFixedOverhead: -1,
      seatingTableCount: 10,
    });
    expect(parsed.success).toBe(false);
  });
});
