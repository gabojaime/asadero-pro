"use client";

import { useEffect, useMemo } from "react";
import type { OrderFulfillmentTiming } from "../domain/entities";
import {
  addCalendarDaysToDayKey,
  buildMinimumScheduledReadyBy,
  formatCalendarDayKey,
  localDateTimeToUtc,
  SCHEDULED_MIN_LEAD_MINUTES,
} from "../domain/merchant-local-time";
import { ORDER_COPY } from "./copy";
import { cn } from "@/lib/utils";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";

type FulfillmentTimingSelectorProps = {
  fulfillmentTiming: OrderFulfillmentTiming;
  readyByAt: Date | null;
  merchantTimezone: string;
  readyByError?: string | null;
  onTimingChange: (timing: OrderFulfillmentTiming) => void;
  onReadyByChange: (readyByAt: Date | null) => void;
};

function formatDateInputValue(dayKey: string): string {
  return dayKey;
}

function formatTimeInputValue(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function parseTimeParts(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function FulfillmentTimingSelector({
  fulfillmentTiming,
  readyByAt,
  merchantTimezone,
  readyByError,
  onTimingChange,
  onReadyByChange,
}: FulfillmentTimingSelectorProps) {
  const bounds = useMemo(() => {
    const now = new Date();
    const minUtc = new Date(now.getTime() + SCHEDULED_MIN_LEAD_MINUTES * 60_000);
    const todayKey = formatCalendarDayKey(merchantTimezone, now);
    const maxDayKey = addCalendarDaysToDayKey(todayKey, 7);

    return {
      minDayKey: formatCalendarDayKey(merchantTimezone, minUtc),
      maxDayKey,
      defaultDayKey: formatCalendarDayKey(merchantTimezone, minUtc),
      defaultTime: formatTimeInputValue(minUtc, merchantTimezone),
    };
  }, [merchantTimezone]);

  const selectedDayKey = readyByAt
    ? formatCalendarDayKey(merchantTimezone, readyByAt)
    : bounds.defaultDayKey;
  const selectedTime = readyByAt
    ? formatTimeInputValue(readyByAt, merchantTimezone)
    : bounds.defaultTime;

  const handleDateChange = (dayKey: string) => {
    const timeParts = parseTimeParts(selectedTime) ?? { hour: 12, minute: 0 };
    onReadyByChange(
      localDateTimeToUtc(
        dayKey,
        timeParts.hour,
        timeParts.minute,
        0,
        merchantTimezone,
      ),
    );
  };

  const handleTimeChange = (timeValue: string) => {
    const timeParts = parseTimeParts(timeValue);
    if (!timeParts) {
      return;
    }

    onReadyByChange(
      localDateTimeToUtc(
        selectedDayKey,
        timeParts.hour,
        timeParts.minute,
        0,
        merchantTimezone,
      ),
    );
  };

  useEffect(() => {
    if (fulfillmentTiming === "scheduled" && readyByAt == null) {
      onReadyByChange(buildMinimumScheduledReadyBy(merchantTimezone));
    }
  }, [fulfillmentTiming, readyByAt, merchantTimezone, onReadyByChange]);

  const options: Array<{ value: OrderFulfillmentTiming; label: string }> = [
    { value: "immediate", label: ORDER_COPY.fulfillmentImmediate },
    { value: "scheduled", label: ORDER_COPY.fulfillmentScheduled },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-semibold tracking-wide">
        {ORDER_COPY.fulfillmentTitle}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onTimingChange(option.value)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-[15px] font-semibold transition-colors",
              fulfillmentTiming === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {fulfillmentTiming === "scheduled" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ready-by-date">{ORDER_COPY.readyByDateLabel}</Label>
            <Input
              id="ready-by-date"
              type="date"
              min={formatDateInputValue(bounds.minDayKey)}
              max={formatDateInputValue(bounds.maxDayKey)}
              value={formatDateInputValue(selectedDayKey)}
              onChange={(event) => handleDateChange(event.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ready-by-time">{ORDER_COPY.readyByTimeLabel}</Label>
            <Input
              id="ready-by-time"
              type="time"
              value={selectedTime}
              onChange={(event) => handleTimeChange(event.target.value)}
              className="min-h-11"
            />
          </div>
          <p className="text-[13px] text-muted-foreground sm:col-span-2">
            {ORDER_COPY.readyByTimezoneHint(merchantTimezone)}
          </p>
          {readyByError ? (
            <p className="text-[13px] text-primary sm:col-span-2">
              {readyByError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
