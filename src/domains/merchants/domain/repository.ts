import type { NormalizedOnboardingInput, OnboardingResult } from "./entities";

export interface MerchantOnboardingRepository {
  createMerchantAndAdminProfile(
    input: NormalizedOnboardingInput,
  ): Promise<OnboardingResult>;
}
