"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  MenuItemKind,
  ProteinGroup,
} from "@/domains/menu/domain/entities";
import {
  useCreateMenuItem,
  useDeactivateMenuItem,
  useUpdateMenuItem,
  type MenuItemDto,
} from "@/domains/menu/infrastructure/query-adapters";
import { MoneyAmountInput } from "@/domains/orders/presentation/MoneyAmountInput";
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
import { formatMenuItemKindLabel } from "./labels";
import { MenuItemKindSelect } from "./MenuItemKindSelect";
import { ProteinGroupSelect } from "./ProteinGroupSelect";

type MenuItemFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  item?: MenuItemDto | null;
  onSuccess?: (message: string) => void;
};

export function MenuItemFormDialog({
  open,
  onOpenChange,
  merchantId,
  item,
  onSuccess,
}: MenuItemFormDialogProps) {
  const isEdit = Boolean(item);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [itemKind, setItemKind] = useState<MenuItemKind>("meat_plate");
  const [proteinGroup, setProteinGroup] = useState<ProteinGroup | null>("beef");
  const [weightLabel, setWeightLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateMenuItem(merchantId);
  const updateMutation = useUpdateMenuItem(merchantId);
  const deactivateMutation = useDeactivateMenuItem(merchantId);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setPrice(item?.price ?? 0);
      setItemKind((item?.itemKind as MenuItemKind) ?? "meat_plate");
      setProteinGroup(
        (item?.proteinGroup as ProteinGroup | null) ??
          (item ? null : "beef"),
      );
      setWeightLabel(item?.weightLabel ?? "");
      setError(null);
      setFieldErrors({});
    }
  }, [open, item]);

  const effectiveKind = isEdit
    ? ((item?.itemKind as MenuItemKind) ?? itemKind)
    : itemKind;
  const showMeatFields = effectiveKind === "meat_plate";

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
          input: {
            name,
            price,
            proteinGroup: showMeatFields ? proteinGroup : null,
            weightLabel: showMeatFields
              ? weightLabel.trim().length > 0
                ? weightLabel.trim()
                : null
              : null,
          },
        });
        onSuccess?.("Ítem actualizado correctamente.");
      } else {
        await createMutation.mutateAsync({
          name,
          price,
          itemKind,
          proteinGroup: showMeatFields ? proteinGroup : null,
          weightLabel: showMeatFields
            ? weightLabel.trim().length > 0
              ? weightLabel.trim()
              : null
            : null,
        });
        onSuccess?.("Ítem creado correctamente.");
      }

      onOpenChange(false);
    } catch (caughtError: unknown) {
      const mutationError = caughtError as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };
      setError(mutationError.message ?? "No se pudo guardar el ítem.");
      setFieldErrors(mutationError.fieldErrors ?? {});
    }
  };

  const handleDeactivate = async () => {
    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      "¿Desactivar este ítem? Dejará de aparecer en pedidos, pero el historial se conserva.",
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await deactivateMutation.mutateAsync(item.id);
      onSuccess?.("Ítem desactivado.");
      onOpenChange(false);
    } catch (caughtError: unknown) {
      const mutationError = caughtError as { message?: string };
      setError(mutationError.message ?? "No se pudo desactivar el ítem.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar ítem" : "Nuevo ítem"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza nombre, precio y datos de porción."
              : "Agrega un plato, bebida o contorno al menú de venta."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="menu-item-name">Nombre</Label>
            <Input
              id="menu-item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={
                fieldErrors.name ? "menu-item-name-error" : undefined
              }
            />
            {fieldErrors.name ? (
              <p id="menu-item-name-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          {isEdit ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Tipo</span>
              <p className="text-sm text-muted-foreground">
                {formatMenuItemKindLabel(effectiveKind)}
              </p>
            </div>
          ) : (
            <MenuItemKindSelect
              id="menu-item-kind"
              value={itemKind}
              onChange={(next) => {
                setItemKind(next);
                if (next !== "meat_plate") {
                  setProteinGroup(null);
                  setWeightLabel("");
                } else if (!proteinGroup) {
                  setProteinGroup("beef");
                }
              }}
              aria-invalid={Boolean(fieldErrors.itemKind)}
            />
          )}

          {showMeatFields ? (
            <>
              <ProteinGroupSelect
                id="menu-item-protein"
                value={proteinGroup}
                onChange={setProteinGroup}
                aria-invalid={Boolean(fieldErrors.proteinGroup)}
                aria-describedby={
                  fieldErrors.proteinGroup
                    ? "menu-item-protein-error"
                    : undefined
                }
              />
              {fieldErrors.proteinGroup ? (
                <p
                  id="menu-item-protein-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.proteinGroup}
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="menu-item-weight">Porción (etiqueta)</Label>
                <Input
                  id="menu-item-weight"
                  value={weightLabel}
                  onChange={(event) => setWeightLabel(event.target.value)}
                  placeholder="300g, 500g, 1kg…"
                  aria-invalid={Boolean(fieldErrors.weightLabel)}
                  aria-describedby={
                    fieldErrors.weightLabel
                      ? "menu-item-weight-error"
                      : undefined
                  }
                />
                {fieldErrors.weightLabel ? (
                  <p
                    id="menu-item-weight-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.weightLabel}
                  </p>
                ) : null}
              </div>

              <div
                className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
                role="status"
              >
                Para descontar inventario y calcular costos, configura la receta
                en{" "}
                <Link href="/waste" className="font-semibold text-primary">
                  Merma y costos
                </Link>
                .
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="menu-item-price">Precio (USD)</Label>
            <MoneyAmountInput
              id="menu-item-price"
              value={price}
              onChange={setPrice}
              aria-invalid={Boolean(fieldErrors.price)}
              aria-describedby={
                fieldErrors.price ? "menu-item-price-error" : undefined
              }
            />
            {fieldErrors.price ? (
              <p
                id="menu-item-price-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldErrors.price}
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {isEdit && item?.isActive ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeactivate}
                disabled={isPending}
              >
                Desactivar ítem
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
                {isEdit ? "Guardar" : "Crear ítem"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
