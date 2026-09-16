import { describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type { OperationalWasteLog } from "../domain/operational-waste";
import type { OperationalWasteRepository } from "../domain/repository";
import {
  listOperationalWasteLogsForDay,
  logOperationalWaste,
} from "./operational-waste-use-cases";

const grillMaster: SessionProfile = {
  userId: "user-grill",
  email: "grill@test.com",
  merchantId: "merchant-1",
  merchantName: "Test",
  fullName: "Grill",
  role: "grill_master",
  isOnboarded: true,
};

const waiter: SessionProfile = {
  ...grillMaster,
  userId: "user-waiter",
  role: "waiter",
};

const sampleLog: OperationalWasteLog = {
  id: "log-1",
  rawMaterialId: "550e8400-e29b-41d4-a716-446655440000",
  rawMaterialName: "Arrachera",
  weightKg: 0.5,
  unitCost: 12,
  totalCost: 6,
  reason: "burned_on_grill",
  loggedByUserId: grillMaster.userId,
  loggedByDisplayName: "Grill",
  createdAt: new Date().toISOString(),
};

function createFakeRepo(
  overrides: Partial<OperationalWasteRepository> = {},
): OperationalWasteRepository {
  return {
    logWaste: vi.fn(async () => ({ log: sampleLog, partialStock: false })),
    listLogsForLocalDay: vi.fn(async () => [sampleLog]),
    listKgRawMaterials: vi.fn(async () => []),
    ...overrides,
  };
}

describe("logOperationalWaste", () => {
  it("denies waiter", async () => {
    const repo = createFakeRepo();
    await expect(
      logOperationalWaste(
        {
          rawMaterialId: sampleLog.rawMaterialId,
          weightKg: 0.5,
          reason: "burned_on_grill",
        },
        waiter,
        repo,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("delegates to repository after validation", async () => {
    const repo = createFakeRepo();
    const input = {
      rawMaterialId: sampleLog.rawMaterialId,
      weightKg: 0.5,
      reason: "burned_on_grill" as const,
    };

    const result = await logOperationalWaste(input, grillMaster, repo);
    expect(result.log.id).toBe("log-1");
    expect(repo.logWaste).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: "merchant-1",
        input,
      }),
    );
  });
});

describe("listOperationalWasteLogsForDay", () => {
  it("returns calendar day key and logs", async () => {
    const repo = createFakeRepo();
    const result = await listOperationalWasteLogsForDay(
      grillMaster,
      repo,
      new Date("2026-01-15T14:00:00.000Z"),
    );

    expect(result.dayKey).toBe("2026-01-15");
    expect(result.logs).toHaveLength(1);
    expect(repo.listLogsForLocalDay).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: "merchant-1",
        limit: 50,
      }),
    );
  });
});
