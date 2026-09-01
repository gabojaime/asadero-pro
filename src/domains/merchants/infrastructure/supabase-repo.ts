import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import {
  AlreadyOnboardedError,
  NotAuthenticatedError,
  OnboardingValidationError,
} from "../domain/errors";
import type { NormalizedOnboardingInput, OnboardingResult } from "../domain/entities";
import type { MerchantOnboardingRepository } from "../domain/repository";

function mapRpcError(error: { message?: string; code?: string }): never {
  const message = error.message ?? "";

  if (message.includes("already_onboarded")) {
    throw new AlreadyOnboardedError();
  }

  if (message.includes("not_authenticated")) {
    throw new NotAuthenticatedError();
  }

  if (message.includes("invalid_input")) {
    throw new OnboardingValidationError({
      merchantName: "Revisa los datos del negocio.",
      ownerFullName: "Revisa tu nombre completo.",
    });
  }

  throw error;
}

export function createMerchantOnboardingRepository(
  supabase: SupabaseClient<Database>,
): MerchantOnboardingRepository {
  return {
    async createMerchantAndAdminProfile(
      input: NormalizedOnboardingInput,
    ): Promise<OnboardingResult> {
      const { data, error } = await supabase.rpc(
        "create_merchant_and_admin_profile",
        {
          p_merchant_name: input.merchantName,
          p_full_name: input.ownerFullName,
          p_address: input.address ?? undefined,
          p_phone: input.phone ?? undefined,
        },
      );

      if (error) {
        mapRpcError(error);
      }

      if (!data) {
        throw new Error("onboarding_missing_merchant_id");
      }

      return { merchantId: data };
    },
  };
}
