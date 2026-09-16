"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatCalendarDayKey,
  OPERATIONAL_WASTE_LOG_TIMEZONE,
} from "@/domains/waste/domain/operational-waste-calendar";
import type {
  ActionFailure,
  KgRawMaterialOptionDto,
  OperationalWasteLogDto,
} from "@/domains/waste/infrastructure/operational-waste-actions";

export function operationalWasteLogsQueryKey(merchantId: string, dayKey: string) {
  return ["operational-waste-logs", merchantId, dayKey] as const;
}

function throwActionError(result: ActionFailure): never {
  const error = new Error(result.message);
  Object.assign(error, {
    code: result.code,
    fieldErrors: result.fieldErrors,
  });
  throw error;
}

function unwrapActionResult<T extends { success: true }>(
  result: T | ActionFailure,
): T {
  if (result.success === false) {
    throwActionError(result);
  }

  return result;
}

export function useKgRawMaterialsForWasteLogging(merchantId: string | null) {
  return useQuery({
    queryKey: ["operational-waste-kg-materials", merchantId ?? "unknown"],
    enabled: Boolean(merchantId),
    staleTime: 60_000,
    queryFn: async () => {
      const { listKgRawMaterialsForWasteLoggingAction } = await import(
        "@/domains/waste/infrastructure/operational-waste-actions"
      );
      const result = await listKgRawMaterialsForWasteLoggingAction();
      return unwrapActionResult(result).materials as KgRawMaterialOptionDto[];
    },
  });
}

export function useOperationalWasteLogsToday(merchantId: string | null) {
  const dayKey = formatCalendarDayKey(
    OPERATIONAL_WASTE_LOG_TIMEZONE,
    new Date(),
  );

  return useQuery({
    queryKey: operationalWasteLogsQueryKey(merchantId ?? "unknown", dayKey),
    enabled: Boolean(merchantId),
    staleTime: 15_000,
    queryFn: async () => {
      const { listOperationalWasteLogsTodayAction } = await import(
        "@/domains/waste/infrastructure/operational-waste-actions"
      );
      const result = await listOperationalWasteLogsTodayAction();
      const unwrapped = unwrapActionResult(result);
      return {
        dayKey: unwrapped.dayKey,
        logs: unwrapped.logs as OperationalWasteLogDto[],
      };
    },
  });
}

export function useLogOperationalWaste(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      rawMaterialId: string;
      weightKg: number;
      reason: string;
    }) => {
      const { logOperationalWasteAction } = await import(
        "@/domains/waste/infrastructure/operational-waste-actions"
      );
      const result = await logOperationalWasteAction(input);
      return unwrapActionResult(result);
    },
    onSuccess: (payload) => {
      if (!merchantId) {
        return;
      }

      const dayKey = formatCalendarDayKey(
        OPERATIONAL_WASTE_LOG_TIMEZONE,
        new Date(),
      );

      queryClient.invalidateQueries({
        queryKey: operationalWasteLogsQueryKey(merchantId, dayKey),
      });
      queryClient.invalidateQueries({
        queryKey: ["raw-materials", merchantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["operational-waste-kg-materials", merchantId],
      });

      return payload;
    },
  });
}

export type { KgRawMaterialOptionDto, OperationalWasteLogDto };
