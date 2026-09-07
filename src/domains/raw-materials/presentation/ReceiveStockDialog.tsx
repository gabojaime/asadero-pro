"use client";

import { useEffect, useState } from "react";
import type { UnitOfMeasure } from "@/domains/raw-materials/domain/entities";
import type { MovementDto } from "@/domains/raw-materials/infrastructure/raw-material-actions";
import {
  useRawMaterialMovements,
  useReceiveStock,
  type RawMaterialDto,
} from "@/domains/raw-materials/infrastructure/query-adapters";
import { Button } from "@/shared/presentation/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/ui/dialog";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";
import {
  formatCurrency,
  formatDateTime,
  formatQuantityWithSuffix,
} from "./formatters";

type ReceiveStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  item: RawMaterialDto | null;
  onSuccess?: (message: string) => void;
};

export function ReceiveStockDialog({
  open,
  onOpenChange,
  merchantId,
  item,
  onSuccess,
}: ReceiveStockDialogProps) {
  const [incomingQuantity, setIncomingQuantity] = useState("");
  const [incomingUnitCost, setIncomingUnitCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const receiveMutation = useReceiveStock(merchantId);
  const movementsQuery = useRawMaterialMovements(
    merchantId,
    item?.id ?? null,
    open && Boolean(item),
  );

  useEffect(() => {
    if (open) {
      setIncomingQuantity("");
      setIncomingUnitCost("");
      setError(null);
      setFieldErrors({});
    }
  }, [open, item?.id]);

  if (!item) {
    return null;
  }

  const unitOfMeasure = item.unitOfMeasure as UnitOfMeasure;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    try {
      await receiveMutation.mutateAsync({
        id: item.id,
        input: {
          incomingQuantity: Number(incomingQuantity),
          incomingUnitCost: Number(incomingUnitCost),
        },
      });

      onSuccess?.("Entrada registrada correctamente.");
      onOpenChange(false);
    } catch (caughtError: unknown) {
      const mutationError = caughtError as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };
      setError(mutationError.message ?? "No se pudo registrar la entrada.");
      setFieldErrors(mutationError.fieldErrors ?? {});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar entrada</DialogTitle>
          <DialogDescription>
            {item.name} — stock actual:{" "}
            {formatQuantityWithSuffix(item.quantityOnHand, unitOfMeasure)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="incoming-quantity">Cantidad recibida</Label>
            <Input
              id="incoming-quantity"
              type="number"
              min="0.001"
              step="0.001"
              value={incomingQuantity}
              onChange={(event) => setIncomingQuantity(event.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.incomingQuantity)}
            />
            {fieldErrors.incomingQuantity ? (
              <p className="text-sm text-destructive">
                {fieldErrors.incomingQuantity}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="incoming-unit-cost">Costo unitario de compra</Label>
            <Input
              id="incoming-unit-cost"
              type="number"
              min="0"
              step="0.01"
              value={incomingUnitCost}
              onChange={(event) => setIncomingUnitCost(event.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.incomingUnitCost)}
            />
            {fieldErrors.incomingUnitCost ? (
              <p className="text-sm text-destructive">
                {fieldErrors.incomingUnitCost}
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={receiveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? "Registrando..." : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-semibold">Entradas recientes</p>
          {movementsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando historial…</p>
          ) : movementsQuery.isError ? (
            <p className="text-sm text-destructive">
              No se pudo cargar el historial.
            </p>
          ) : movementsQuery.data && movementsQuery.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {movementsQuery.data.map((movement: MovementDto) => (
                <li
                  key={movement.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span>
                    {formatQuantityWithSuffix(movement.quantity, unitOfMeasure)} @{" "}
                    {formatCurrency(movement.unitCost)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTime(movement.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin entradas registradas aún.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
