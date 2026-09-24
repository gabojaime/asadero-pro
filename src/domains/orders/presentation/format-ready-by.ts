import { formatCalendarDayKey } from "../domain/merchant-local-time";

export function formatReadyByKitchenLabel(
  readyByAtIso: string,
  merchantTimezone: string,
  now: Date = new Date(),
): string {
  const readyByAt = new Date(readyByAtIso);
  const timeLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: merchantTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(readyByAt);

  const todayKey = formatCalendarDayKey(merchantTimezone, now);
  const readyDayKey = formatCalendarDayKey(merchantTimezone, readyByAt);

  if (todayKey === readyDayKey) {
    return `Para las ${timeLabel}`;
  }

  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: merchantTimezone,
    day: "2-digit",
    month: "2-digit",
  }).format(readyByAt);

  return `Para las ${timeLabel} (${dateLabel})`;
}
