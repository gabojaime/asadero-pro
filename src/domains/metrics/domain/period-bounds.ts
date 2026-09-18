import type { DashboardPeriod, PeriodBounds } from "./entities";
import { DASHBOARD_TIMEZONE } from "./entities";
import {
  formatCalendarDayKey,
  getCalendarDayBoundsUtc,
} from "@/domains/waste/domain/operational-waste-calendar";

function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

function addDaysToDayKey(dayKey: string, delta: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const next = new Date(Date.UTC(year, month - 1, day + delta));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInCalendarMonth(dayKey: string): number {
  const { year, month } = parseDayKey(dayKey);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildDayKeyRange(startDayKey: string, endDayKey: string): string[] {
  const keys: string[] = [];
  let cursor = startDayKey;
  while (cursor <= endDayKey) {
    keys.push(cursor);
    if (cursor === endDayKey) {
      break;
    }
    cursor = addDaysToDayKey(cursor, 1);
  }
  return keys;
}

function dayStartIsoFromDayKey(dayKey: string, timeZone: string): string {
  return getCalendarDayBoundsUtc(
    timeZone,
    new Date(`${dayKey}T12:00:00.000Z`),
  ).dayStartIso;
}

export function resolvePeriodBounds(
  period: DashboardPeriod,
  instant: Date = new Date(),
  timeZone: string = DASHBOARD_TIMEZONE,
): PeriodBounds {
  const todayKey = formatCalendarDayKey(timeZone, instant);
  const todayBounds = getCalendarDayBoundsUtc(timeZone, instant);
  const daysInMonth = daysInCalendarMonth(todayKey);
  const monthToDateDaysElapsed = parseDayKey(todayKey).day;

  if (period === "today") {
    return {
      period,
      startIso: todayBounds.dayStartIso,
      endIso: todayBounds.dayEndIso,
      dayKeys: [todayKey],
      daysInPeriod: 1,
      monthToDateDaysElapsed,
      daysInMonth,
    };
  }

  if (period === "last_7_days") {
    const startDayKey = addDaysToDayKey(todayKey, -6);
    return {
      period,
      startIso: dayStartIsoFromDayKey(startDayKey, timeZone),
      endIso: todayBounds.dayEndIso,
      dayKeys: buildDayKeyRange(startDayKey, todayKey),
      daysInPeriod: 7,
      monthToDateDaysElapsed,
      daysInMonth,
    };
  }

  const { year, month } = parseDayKey(todayKey);
  const monthStartKey = `${year}-${String(month).padStart(2, "0")}-01`;

  return {
    period,
    startIso: dayStartIsoFromDayKey(monthStartKey, timeZone),
    endIso: todayBounds.dayEndIso,
    dayKeys: buildDayKeyRange(monthStartKey, todayKey),
    daysInPeriod: buildDayKeyRange(monthStartKey, todayKey).length,
    monthToDateDaysElapsed,
    daysInMonth,
  };
}

export function formatPeriodLabel(period: DashboardPeriod): string {
  switch (period) {
    case "today":
      return "Hoy";
    case "last_7_days":
      return "Últimos 7 días";
    case "month_to_date":
      return "Mes en curso";
    default:
      return period;
  }
}

export function formatDayLabel(dayKey: string): string {
  const { day, month } = parseDayKey(dayKey);
  return `${day}/${month}`;
}
