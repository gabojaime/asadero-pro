export const DEFAULT_MERCHANT_TIMEZONE = "America/Caracas";
export const SCHEDULED_MIN_LEAD_MINUTES = 5;
export const SCHEDULED_MAX_CALENDAR_DAYS = 7;

export function formatCalendarDayKey(
  timeZone: string,
  instant: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

export function addCalendarDaysToDayKey(dayKey: string, days: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatInstantPartsInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function localDateTimeToUtc(
  dayKey: string,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const { year, month, day } = parseDayKey(dayKey);
  const target = {
    year: String(year),
    month: String(month).padStart(2, "0"),
    day: String(day).padStart(2, "0"),
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
    second: String(second).padStart(2, "0"),
  };

  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const parts = formatInstantPartsInZone(new Date(utcGuess), timeZone);
    if (
      parts.year === target.year &&
      parts.month === target.month &&
      parts.day === target.day &&
      parts.hour === target.hour &&
      parts.minute === target.minute &&
      parts.second === target.second
    ) {
      return new Date(utcGuess);
    }

    const guessedDayKey = `${parts.year}-${parts.month}-${parts.day}`;
    const targetDayKey = `${target.year}-${target.month}-${target.day}`;

    if (guessedDayKey < targetDayKey) {
      utcGuess += 3_600_000;
    } else if (guessedDayKey > targetDayKey) {
      utcGuess -= 3_600_000;
    } else {
      const guessedSeconds =
        Number(parts.hour) * 3600 +
        Number(parts.minute) * 60 +
        Number(parts.second);
      const targetSeconds = hour * 3600 + minute * 60 + second;
      utcGuess += (targetSeconds - guessedSeconds) * 1000;
    }
  }

  throw new Error(`Could not resolve local time in ${timeZone}`);
}

export function getLocalTimeParts(instant: Date, timeZone: string) {
  return formatInstantPartsInZone(instant, timeZone);
}

export function buildMinimumScheduledReadyBy(
  timeZone: string,
  now: Date = new Date(),
): Date {
  const minUtc = new Date(now.getTime() + SCHEDULED_MIN_LEAD_MINUTES * 60_000);
  const dayKey = formatCalendarDayKey(timeZone, minUtc);
  const parts = formatInstantPartsInZone(minUtc, timeZone);
  return localDateTimeToUtc(
    dayKey,
    Number(parts.hour),
    Number(parts.minute),
    0,
    timeZone,
  );
}

export function getScheduledWindowBoundsUtc(
  timeZone: string,
  now: Date,
  maxCalendarDays: number = SCHEDULED_MAX_CALENDAR_DAYS,
): { maxReadyByUtc: Date } {
  const todayKey = formatCalendarDayKey(timeZone, now);
  const lastAllowedDayKey = addCalendarDaysToDayKey(todayKey, maxCalendarDays);
  const maxReadyByUtc = localDateTimeToUtc(
    lastAllowedDayKey,
    23,
    59,
    59,
    timeZone,
  );
  return { maxReadyByUtc };
}
