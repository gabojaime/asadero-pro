"use server";

import {
  listKgRawMaterialsForWasteLogging,
  listOperationalWasteLogsForDay,
  logOperationalWaste,
} from "@/domains/waste/application/operational-waste-use-cases";
import type {
  KgRawMaterialOption,
  OperationalWasteLog,
} from "@/domains/waste/domain/operational-waste";
import { WasteError } from "@/domains/waste/domain/errors";
import { createOperationalWasteRepository } from "@/domains/waste/infrastructure/supabase-operational-waste-repo";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createClient } from "@/shared/infrastructure/supabase/server";

type ActionFailure = {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

type OperationalWasteLogDto = OperationalWasteLog;
type KgRawMaterialOptionDto = KgRawMaterialOption;

function mapError(error: unknown): ActionFailure {
  if (error instanceof WasteError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  return {
    success: false,
    code: "unknown",
    message: "No se pudo completar la operación. Intenta de nuevo.",
  };
}

async function getAuthenticatedContext() {
  const profile = await getServerSessionProfile();
  if (!profile?.merchantId || !profile.role || !profile.userId) {
    throw new WasteError("forbidden", "Sesión inválida.");
  }

  const supabase = await createClient();
  return {
    profile,
    operationalWasteRepo: createOperationalWasteRepository(supabase),
  };
}

export async function logOperationalWasteAction(input: {
  rawMaterialId: string;
  weightKg: number;
  reason: string;
}): Promise<
  | {
      success: true;
      log: OperationalWasteLogDto;
      partialStock: boolean;
    }
  | ActionFailure
> {
  try {
    const { profile, operationalWasteRepo } = await getAuthenticatedContext();
    const result = await logOperationalWaste(
      input,
      profile,
      operationalWasteRepo,
    );
    return {
      success: true,
      log: result.log,
      partialStock: result.partialStock,
    };
  } catch (error) {
    return mapError(error);
  }
}

export async function listOperationalWasteLogsTodayAction(): Promise<
  | { success: true; dayKey: string; logs: OperationalWasteLogDto[] }
  | ActionFailure
> {
  try {
    const { profile, operationalWasteRepo } = await getAuthenticatedContext();
    const result = await listOperationalWasteLogsForDay(
      profile,
      operationalWasteRepo,
    );
    return { success: true, ...result };
  } catch (error) {
    return mapError(error);
  }
}

export async function listKgRawMaterialsForWasteLoggingAction(): Promise<
  | { success: true; materials: KgRawMaterialOptionDto[] }
  | ActionFailure
> {
  try {
    const { profile, operationalWasteRepo } = await getAuthenticatedContext();
    const materials = await listKgRawMaterialsForWasteLogging(
      profile,
      operationalWasteRepo,
    );
    return { success: true, materials };
  } catch (error) {
    return mapError(error);
  }
}

export type {
  ActionFailure,
  KgRawMaterialOptionDto,
  OperationalWasteLogDto,
};
