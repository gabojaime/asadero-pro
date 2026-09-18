"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateMerchantDashboardSettingsAction } from "../infrastructure/dashboard-settings-actions";
import type { MerchantDashboardSettings } from "../domain/entities";
import { Button } from "@/shared/presentation/ui/button";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";

export function DashboardSettingsStrip({
  settings,
}: {
  settings: MerchantDashboardSettings;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const overheadRaw = String(formData.get("monthlyFixedOverhead") ?? "").trim();
      const tablesRaw = String(formData.get("seatingTableCount") ?? "").trim();
      const result = await updateMerchantDashboardSettingsAction({
        monthlyFixedOverhead:
          overheadRaw === "" ? null : Number(overheadRaw.replace(",", ".")),
        seatingTableCount:
          tablesRaw === "" ? null : Number.parseInt(tablesRaw, 10),
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto]"
    >
      <div className="space-y-2">
        <Label htmlFor="monthlyFixedOverhead">Overhead fijo mensual (USD)</Label>
        <Input
          id="monthlyFixedOverhead"
          name="monthlyFixedOverhead"
          defaultValue={settings.monthlyFixedOverhead ?? ""}
          inputMode="decimal"
          placeholder="Ej. 5000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="seatingTableCount">Mesas en salón</Label>
        <Input
          id="seatingTableCount"
          name="seatingTableCount"
          defaultValue={settings.seatingTableCount ?? ""}
          inputMode="numeric"
          placeholder="Ej. 12"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
