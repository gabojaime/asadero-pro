import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import {
  DEFAULT_KITCHEN_PRIORITY_HORIZON_MINUTES,
  type MerchantKitchenSettings,
} from "../domain/entities";
import { DEFAULT_MERCHANT_TIMEZONE } from "../domain/merchant-local-time";
import type { MerchantKitchenSettingsRepository } from "../domain/repository";

export function createMerchantKitchenSettingsRepository(
  supabase: SupabaseClient<Database>,
): MerchantKitchenSettingsRepository {
  return {
    async getKitchenSettings(merchantId) {
      const { data, error } = await supabase
        .from("merchants")
        .select("timezone, kitchen_priority_horizon_minutes")
        .eq("id", merchantId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return {
          timezone: DEFAULT_MERCHANT_TIMEZONE,
          kitchenPriorityHorizonMinutes:
            DEFAULT_KITCHEN_PRIORITY_HORIZON_MINUTES,
        };
      }

      return mapKitchenSettingsRow(data);
    },
  };
}

export function mapKitchenSettingsRow(row: {
  timezone?: string | null;
  kitchen_priority_horizon_minutes?: number | null;
}): MerchantKitchenSettings {
  return {
    timezone: row.timezone ?? DEFAULT_MERCHANT_TIMEZONE,
    kitchenPriorityHorizonMinutes:
      row.kitchen_priority_horizon_minutes ??
      DEFAULT_KITCHEN_PRIORITY_HORIZON_MINUTES,
  };
}
