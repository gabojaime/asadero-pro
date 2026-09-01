import {
  AlreadyOnboardedError,
  NotAuthenticatedError,
  OnboardingPersistenceError,
  OnboardingValidationError,
} from "../domain/errors";
import type { OnboardingInput, OnboardingResult } from "../domain/entities";
import type { MerchantOnboardingRepository } from "../domain/repository";
import { validateOnboardingInput } from "../domain/validations";

export async function completeMerchantOnboarding(
  input: OnboardingInput,
  repository: MerchantOnboardingRepository,
): Promise<OnboardingResult> {
  const validation = validateOnboardingInput(input);
  if (!validation.success) {
    throw new OnboardingValidationError(validation.fieldErrors);
  }

  try {
    return await repository.createMerchantAndAdminProfile(validation.data);
  } catch (error) {
    if (error instanceof AlreadyOnboardedError) {
      throw error;
    }
    if (error instanceof NotAuthenticatedError) {
      throw error;
    }
    if (error instanceof OnboardingValidationError) {
      throw error;
    }
    throw new OnboardingPersistenceError();
  }
}
