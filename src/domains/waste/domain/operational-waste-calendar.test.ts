import { describe, expect, it } from "vitest";
import {
  formatCalendarDayKey,
  getCalendarDayBoundsUtc,
  OPERATIONAL_WASTE_LOG_TIMEZONE,
} from "./operational-waste-calendar";

describe("operational waste calendar day bounds", () => {
  it("formats day key in America/Caracas", () => {
    const instant = new Date("2026-01-15T03:30:00.000Z");
    expect(formatCalendarDayKey(OPERATIONAL_WASTE_LOG_TIMEZONE, instant)).toBe(
      "2026-01-14",
    );
  });

  it("returns half-open interval for the local calendar day", () => {
    const instant = new Date("2026-01-15T14:00:00.000Z");
    const bounds = getCalendarDayBoundsUtc(
      OPERATIONAL_WASTE_LOG_TIMEZONE,
      instant,
    );

    expect(bounds.dayKey).toBe("2026-01-15");
    expect(new Date(bounds.dayStartIso).getTime()).toBeLessThan(
      new Date(bounds.dayEndIso).getTime(),
    );
    expect(instant.getTime()).toBeGreaterThanOrEqual(
      new Date(bounds.dayStartIso).getTime(),
    );
    expect(instant.getTime()).toBeLessThan(new Date(bounds.dayEndIso).getTime());
  });
});
