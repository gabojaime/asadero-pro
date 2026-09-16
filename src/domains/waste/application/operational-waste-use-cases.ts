import type { SessionProfile } from "@/domains/auth/domain/entities";
import { WasteError } from "../domain/errors";
import {
  getCalendarDayBoundsUtc,
  OPERATIONAL_WASTE_LOG_TIMEZONE,
} from "../domain/operational-waste-calendar";
import type { OperationalWasteLog } from "../domain/operational-waste";
import { validateOperationalWasteInput } from "../domain/operational-waste";
import type { OperationalWasteRepository } from "../domain/repository";

const OPERATIONAL_WASTE_LOG_LIMIT = 50;

const LOGGING_ROLES = new Set<SessionProfile["role"]>(["admin", "grill_master"]);

function assertCanLogOperationalWaste(profile: SessionProfile): void {
  if (!profile.merchantId || !profile.userId) {
    throw new WasteError("forbidden", "Se requiere el contexto del negocio.");
  }

  if (!profile.role || !LOGGING_ROLES.has(profile.role)) {
    throw new WasteError(
      "forbidden",
      "No tienes permiso para registrar mermas.",
    );
  }
}

export async function logOperationalWaste(
  input: unknown,
  profile: SessionProfile,
  repository: OperationalWasteRepository,
): Promise<{ log: OperationalWasteLog; partialStock: boolean }> {
  assertCanLogOperationalWaste(profile);

  const validation = validateOperationalWasteInput(input);
  if (!validation.success) {
    throw new WasteError(
      "validation_failed",
      "Revisa kilos y motivo.",
      validation.fieldErrors,
    );
  }

  return repository.logWaste({
    merchantId: profile.merchantId!,
    actorUserId: profile.userId!,
    actorRole: profile.role!,
    input: validation.data,
  });
}

export async function listOperationalWasteLogsForDay(
  profile: SessionProfile,
  repository: OperationalWasteRepository,
  referenceInstant: Date = new Date(),
): Promise<{ dayKey: string; logs: OperationalWasteLog[] }> {
  assertCanLogOperationalWaste(profile);

  const { dayKey, dayStartIso, dayEndIso } = getCalendarDayBoundsUtc(
    OPERATIONAL_WASTE_LOG_TIMEZONE,
    referenceInstant,
  );

  const logs = await repository.listLogsForLocalDay({
    merchantId: profile.merchantId!,
    dayStartIso,
    dayEndIso,
    limit: OPERATIONAL_WASTE_LOG_LIMIT,
  });

  return { dayKey, logs };
}

export async function listKgRawMaterialsForWasteLogging(
  profile: SessionProfile,
  repository: OperationalWasteRepository,
) {
  assertCanLogOperationalWaste(profile);
  return repository.listKgRawMaterials(profile.merchantId!);
}

export { OPERATIONAL_WASTE_LOG_TIMEZONE, OPERATIONAL_WASTE_LOG_LIMIT };
