"use client";

import { useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import {
  useMeatPlateCostingRows,
  useUpdateTargetFoodCostPct,
  useUpdateWastePct,
} from "@/domains/waste/infrastructure/query-adapters";
import { Button } from "@/shared/presentation/ui/button";
import { Input } from "@/shared/presentation/ui/input";
import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { MeatPlateCostingTable } from "./MeatPlateCostingTable";

export function WasteCostingView() {
  const session = useSession();
  const merchantId = session.merchantId;
  const costingQuery = useMeatPlateCostingRows(merchantId);
  const updateWasteMutation = useUpdateWastePct(merchantId);
  const updateTargetMutation = useUpdateTargetFoodCostPct(merchantId);
  const [targetPctInput, setTargetPctInput] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingMenuItemId, setSavingMenuItemId] = useState<string | null>(null);

  const targetPctDisplay =
    targetPctInput ??
    (costingQuery.data
      ? String(Math.round(costingQuery.data.targetFoodCostPct * 10000) / 100)
      : "33");

  const handleSaveTarget = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    const parsed = Number(targetPctDisplay.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      setErrorMessage("Ingresa un costo meta entre 0.01% y 100%.");
      return;
    }

    try {
      await updateTargetMutation.mutateAsync({
        targetFoodCostPct: parsed / 100,
      });
      setTargetPctInput(null);
      setStatusMessage("Costo meta actualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el costo meta.",
      );
    }
  };

  const handleSaveWastePct = async (menuItemId: string, wastePct: number) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setSavingMenuItemId(menuItemId);

    try {
      await updateWasteMutation.mutateAsync({ menuItemId, wastePct });
      setStatusMessage("Merma actualizada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar la merma.",
      );
    } finally {
      setSavingMenuItemId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Merma y costos</h1>
        <p className="text-sm text-muted-foreground">
          Configura merma por plato y revisa precios recomendados según el costo
          meta del negocio.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-none sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <label htmlFor="target-food-cost" className="text-sm font-semibold">
            Costo meta %
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="target-food-cost"
              value={targetPctDisplay}
              onChange={(event) => setTargetPctInput(event.target.value)}
              inputMode="decimal"
              className="h-10 w-28"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void handleSaveTarget()}
          disabled={updateTargetMutation.isPending || !merchantId}
        >
          {updateTargetMutation.isPending ? "Guardando…" : "Guardar costo meta"}
        </Button>
      </div>

      {statusMessage ? (
        <p role="status" className="text-sm text-primary">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {costingQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : costingQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar la tabla de merma y costos.
        </p>
      ) : costingQuery.data && costingQuery.data.rows.length > 0 ? (
        <MeatPlateCostingTable
          rows={costingQuery.data.rows}
          savingMenuItemId={savingMenuItemId}
          onSaveWastePct={handleSaveWastePct}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay platos de carne activos para costear.
        </p>
      )}
    </div>
  );
}
