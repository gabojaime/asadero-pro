import { describe, expect, it, vi } from "vitest";
import { completeMerchantOnboarding } from "./use-cases";
import {
  AlreadyOnboardedError,
  OnboardingValidationError,
} from "../domain/errors";
import type { MerchantOnboardingRepository } from "../domain/repository";

function createRepository(
  overrides: Partial<MerchantOnboardingRepository> = {},
): MerchantOnboardingRepository {
  return {
    createMerchantAndAdminProfile: vi.fn().mockResolvedValue({
      merchantId: "merchant-1",
    }),
    ...overrides,
  };
}

describe("completeMerchantOnboarding", () => {
  it("validates input before calling the repository", async () => {
    const repository = createRepository();

    await expect(
      completeMerchantOnboarding(
        { merchantName: "", ownerFullName: "" },
        repository,
      ),
    ).rejects.toBeInstanceOf(OnboardingValidationError);

    expect(repository.createMerchantAndAdminProfile).not.toHaveBeenCalled();
  });

  it("returns merchant id on success", async () => {
    const repository = createRepository();

    const result = await completeMerchantOnboarding(
      {
        merchantName: "Asadero Central",
        ownerFullName: "Maria Lopez",
      },
      repository,
    );

    expect(result.merchantId).toBe("merchant-1");
    expect(repository.createMerchantAndAdminProfile).toHaveBeenCalledWith({
      merchantName: "Asadero Central",
      ownerFullName: "Maria Lopez",
      address: null,
      phone: null,
    });
  });

  it("propagates already onboarded errors", async () => {
    const repository = createRepository({
      createMerchantAndAdminProfile: vi
        .fn()
        .mockRejectedValue(new AlreadyOnboardedError()),
    });

    await expect(
      completeMerchantOnboarding(
        {
          merchantName: "Asadero Central",
          ownerFullName: "Maria Lopez",
        },
        repository,
      ),
    ).rejects.toBeInstanceOf(AlreadyOnboardedError);
  });
});
