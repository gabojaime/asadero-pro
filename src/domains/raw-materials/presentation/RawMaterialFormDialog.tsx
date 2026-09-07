"use client";

import { useEffect, useState } from "react";
import type { UnitOfMeasure } from "@/domains/raw-materials/domain/entities";
import {
  useCreateRawMaterial,
  useDeactivateRawMaterial,
  useUpdateRawMaterial,
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
import { UnitOfMeasureSelect } from "./UnitOfMeasureSelect";
import { formatUnitOfMeasureLabel } from "./formatters";

type RawMaterialFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  item?: RawMaterialDto | null;
  onSuccess?: (message: string) => void;
};

export function RawMaterialFormDialog({
  open,
  onOpenChange,
  merchantId,
  item,
  onSuccess,
}: RawMaterialFormDialogProps) {
  const isEdit = Boolean(item);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>("kilogram");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateRawMaterial(merchantId);
  const updateMutation = useUpdateRawMaterial(merchantId);
  const deactivateMutation = useDeactivateRawMaterial(merchantId);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setSku(item?.sku ?? "");
      setUnitOfMeasure((item?.unitOfMeasure as UnitOfMeasure) ?? "kilogram");
      setError(null);
      setFieldErrors({});
    }
  }, [open, item]);

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    try {
      if (isEdit && item) {
        await updateMutation.mutateAsync({
          id: item.id,
          input: { name, sku: sku.length > 0 ? sku : null },
        });
        onSuccess?.("Insumo actualizado correctamente.");
      } else {
        await createMutation.mutateAsync({
          name,
          sku: sku.length > 0 ? sku : null,
          unitOfMeasure,
        });
        onSuccess?.("Insumo creado correctamente.");
      }

      onOpenChange(false);
    } catch (caughtError: unknown) {
      const mutationError = caughtError as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };
      setError(mutationError.message ?? "No se pudo guardar el insumo.");
      setFieldErrors(mutationError.fieldErrors ?? {});
    }
  };

  const handleDeactivate = async () => {
    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      "¿Desactivar este insumo? Dejará de aparecer en la lista activa.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deactivateMutation.mutateAsync(item.id);
      onSuccess?.("Insumo desactivado correctamente.");
      onOpenChange(false);
    } catch (caughtError: unknown) {
      const mutationError = caughtError as { message?: string };
      setError(mutationError.message ?? "No se pudo desactivar el insumo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza el nombre o SKU. La unidad de medida no se puede cambiar."
              : "Registra un insumo con su unidad de medida."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-name">Nombre</Label>
            <Input
              id="material-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="material-sku">SKU (opcional)</Label>
            <Input
              id="material-sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              aria-invalid={Boolean(fieldErrors.sku)}
            />
            {fieldErrors.sku ? (
              <p className="text-sm text-destructive">{fieldErrors.sku}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="material-uom">Unidad de medida</Label>
            {isEdit ? (
              <p
                id="material-uom"
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
              >
                {formatUnitOfMeasureLabel(unitOfMeasure)}
              </p>
            ) : (
              <UnitOfMeasureSelect
                id="material-uom"
                value={unitOfMeasure}
                onValueChange={setUnitOfMeasure}
              />
            )}
            {fieldErrors.unitOfMeasure ? (
              <p className="text-sm text-destructive">{fieldErrors.unitOfMeasure}</p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeactivate}
                disabled={isPending}
              >
                Desactivar insumo
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : isEdit ? "Guardar" : "Crear insumo"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
