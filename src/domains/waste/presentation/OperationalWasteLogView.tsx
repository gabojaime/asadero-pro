"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import { formatMoneyUsdEs } from "@/domains/orders/presentation/format-money";
import {
  WASTE_REASON_LABELS_ES,
  WASTE_REASON_VALUES,
  type WasteReason,
} from "@/domains/waste/domain/operational-waste";
import { OPERATIONAL_WASTE_LOG_TIMEZONE } from "@/domains/waste/domain/operational-waste-calendar";
import {
  useKgRawMaterialsForWasteLogging,
  useLogOperationalWaste,
  useOperationalWasteLogsToday,
} from "@/domains/waste/infrastructure/operational-waste-query-adapters";
import { Button } from "@/shared/presentation/ui/button";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/ui/select";
import { Skeleton } from "@/shared/presentation/ui/skeleton";

function formatTimeInCaracas(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: OPERATIONAL_WASTE_LOG_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function OperationalWasteLogView() {
  const session = useSession();
  const merchantId = session.merchantId;
  const isAdmin = session.role === "admin";

  const materialsQuery = useKgRawMaterialsForWasteLogging(merchantId);
  const logsQuery = useOperationalWasteLogsToday(merchantId);
  const logMutation = useLogOperationalWaste(merchantId);

  const [rawMaterialId, setRawMaterialId] = useState<string>("");
  const [weightInput, setWeightInput] = useState("");
  const [reason, setReason] = useState<WasteReason | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);

  const selectedMaterial = useMemo(
    () => materialsQuery.data?.find((item) => item.id === rawMaterialId),
    [materialsQuery.data, rawMaterialId],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setStatusMessage(null);
    setErrorMessage(null);
    setPartialWarning(null);

    const parsedWeight = Number(weightInput.replace(",", "."));
    if (!rawMaterialId || !reason) {
      setErrorMessage("Selecciona insumo y motivo.");
      return;
    }

    try {
      const result = await logMutation.mutateAsync({
        rawMaterialId,
        weightKg: parsedWeight,
        reason,
      });

      setWeightInput("");
      setReason("");
      setStatusMessage("Merma registrada.");

      if (result.partialStock) {
        setPartialWarning(
          "Se registró la merma, pero el inventario disponible era menor que los kilos indicados.",
        );
      }
    } catch (error) {
      const fieldErrs =
        error instanceof Error &&
        "fieldErrors" in error &&
        typeof (error as { fieldErrors?: Record<string, string> }).fieldErrors ===
          "object"
          ? (error as { fieldErrors: Record<string, string> }).fieldErrors
          : undefined;

      if (fieldErrs && Object.keys(fieldErrs).length > 0) {
        setFieldErrors(fieldErrs);
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la merma.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-8 tracking-tight">
          Registrar merma
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Indica kilos y motivo. Solo insumos en kilogramos.
        </p>
        {isAdmin ? (
          <Link
            href="/waste"
            className="text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Configuración de merma y costos →
          </Link>
        ) : null}
      </header>

      {partialWarning ? (
        <p
          className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-[13px] text-primary"
          role="status"
        >
          {partialWarning}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="text-[13px] font-semibold text-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-[13px] text-primary" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6"
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] md:items-start">
          <div className="flex flex-col gap-2">
            <Label htmlFor="waste-material" className="text-[13px] font-semibold">
              Insumo
            </Label>
            {materialsQuery.isLoading ? (
              <Skeleton className="h-11 w-full" />
            ) : (
              <Select
                value={rawMaterialId || undefined}
                onValueChange={setRawMaterialId}
              >
                <SelectTrigger id="waste-material" className="min-h-11 w-full">
                  <SelectValue placeholder="Selecciona insumo" />
                </SelectTrigger>
                <SelectContent>
                  {(materialsQuery.data ?? []).map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="min-h-[18px] text-[12px] leading-[18px] text-muted-foreground">
              {selectedMaterial
                ? `Disponible: ${selectedMaterial.quantityOnHand.toFixed(3)} kg`
                : "\u00A0"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="waste-kg" className="text-[13px] font-semibold">
              Kilos
            </Label>
            <div className="relative">
              <Input
                id="waste-kg"
                inputMode="decimal"
                className="min-h-11 pr-10 text-right tabular-nums"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
                aria-invalid={Boolean(fieldErrors.weightKg)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">
                kg
              </span>
            </div>
            {fieldErrors.weightKg ? (
              <p className="text-[12px] text-primary">{fieldErrors.weightKg}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="waste-reason" className="text-[13px] font-semibold">
              Motivo
            </Label>
            <Select
              value={reason || undefined}
              onValueChange={(value) => setReason(value as WasteReason)}
            >
              <SelectTrigger id="waste-reason" className="min-h-11 w-full">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                {WASTE_REASON_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {WASTE_REASON_LABELS_ES[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.reason ? (
              <p className="text-[12px] text-primary">{fieldErrors.reason}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label
              className="pointer-events-none text-[13px] font-semibold invisible select-none"
              aria-hidden="true"
            >
              Registrar
            </Label>
            <Button
              type="submit"
              className="min-h-11 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              disabled={logMutation.isPending || materialsQuery.isLoading}
            >
              {logMutation.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Mermas de hoy</h2>

        {logsQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {logsQuery.isError ? (
          <p className="text-[13px] text-primary">
            No se pudo cargar el historial de hoy.
          </p>
        ) : null}

        {logsQuery.isSuccess && logsQuery.data.logs.length === 0 ? (
          <p className="rounded-md border border-border bg-muted/30 px-4 py-6 text-[14px] text-muted-foreground">
            Aún no hay mermas registradas hoy.
          </p>
        ) : null}

        {logsQuery.isSuccess && logsQuery.data.logs.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-semibold">Hora</th>
                  <th className="px-4 py-3 font-semibold">Insumo</th>
                  <th className="px-4 py-3 font-semibold text-right">Kg</th>
                  <th className="px-4 py-3 font-semibold">Motivo</th>
                  <th className="px-4 py-3 font-semibold text-right">Costo</th>
                  <th className="px-4 py-3 font-semibold">Registró</th>
                </tr>
              </thead>
              <tbody>
                {logsQuery.data.logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 tabular-nums">
                      {formatTimeInCaracas(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{log.rawMaterialName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {log.weightKg.toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3">
                      {WASTE_REASON_LABELS_ES[log.reason]}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoneyUsdEs(log.totalCost)}
                    </td>
                    <td className="px-4 py-3">
                      {log.loggedByDisplayName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
