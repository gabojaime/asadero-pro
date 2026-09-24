import {
  DEFAULT_KITCHEN_PRIORITY_HORIZON_MINUTES,
  type MerchantKitchenSettings,
} from "../../domain/entities";
import { DEFAULT_MERCHANT_TIMEZONE } from "../../domain/merchant-local-time";
import type { MerchantKitchenSettingsRepository } from "../../domain/repository";

export function createInMemoryMerchantKitchenSettingsRepo(
  settings?: Partial<MerchantKitchenSettings>,
): MerchantKitchenSettingsRepository {
  const resolved: MerchantKitchenSettings = {
    timezone: settings?.timezone ?? DEFAULT_MERCHANT_TIMEZONE,
    kitchenPriorityHorizonMinutes:
      settings?.kitchenPriorityHorizonMinutes ??
      DEFAULT_KITCHEN_PRIORITY_HORIZON_MINUTES,
  };

  return {
    async getKitchenSettings() {
      return resolved;
    },
  };
}
