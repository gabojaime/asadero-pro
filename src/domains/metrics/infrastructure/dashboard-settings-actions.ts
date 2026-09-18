"use server";

import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { updateDashboardSettingsSchema } from "@/domains/metrics/domain/validations";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { createMetricsReadRepository } from "./supabase-metrics-read-repo";

type ActionResult =
  | { success: true }
  | { success: false; message: string; fieldErrors?: Record<string, string> };

export async function updateMerchantDashboardSettingsAction(input: {
  monthlyFixedOverhead: number | null;
  seatingTableCount: number | null;
}): Promise<ActionResult> {
  const profile = await getServerSessionProfile();
  if (!profile?.merchantId || profile.role !== "admin") {
    return { success: false, message: "No autorizado." };
  }

  const parsed = updateDashboardSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      message: "Revisa los valores del formulario.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const repo = createMetricsReadRepository(supabase);
    await repo.updateMerchantSettings(profile.merchantId, parsed.data);
    return { success: true };
  } catch {
    return {
      success: false,
      message: "No se pudieron guardar los ajustes.",
    };
  }
}
