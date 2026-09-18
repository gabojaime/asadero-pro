"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import {
  useMenuCatalog,
  useProteinInsumoAvailability,
  useReactivateMenuItem,
  useSeedStarterMenuCatalog,
  type MenuItemDto,
} from "@/domains/menu/infrastructure/query-adapters";
import type { ProteinGroup } from "@/domains/menu/domain/entities";
import { Button } from "@/shared/presentation/ui/button";
import { Checkbox } from "@/shared/presentation/ui/checkbox";
import { Label } from "@/shared/presentation/ui/label";
import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { MenuItemFormDialog } from "./MenuItemFormDialog";
import { MenuItemTable } from "./MenuItemTable";

const PROTEIN_GROUP_LABELS: Record<ProteinGroup, string> = {
  beef: "Carne",
  pork: "Cochino",
  chicken: "Pollo",
};

function formatMissingProteinGroups(groups: ProteinGroup[]): string {
  return groups.map((group) => PROTEIN_GROUP_LABELS[group]).join(", ");
}

export function MenuCatalogView() {
  const session = useSession();
  const merchantId = session.merchantId;
  const [showInactive, setShowInactive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemDto | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const catalogQuery = useMenuCatalog(merchantId, { activeOnly: false });
  const reactivateMutation = useReactivateMenuItem(merchantId);

  const menuCatalogIsEmpty =
    Boolean(merchantId) &&
    catalogQuery.isSuccess &&
    catalogQuery.data.length === 0;

  const proteinQuery = useProteinInsumoAvailability(merchantId, {
    enabled: menuCatalogIsEmpty,
  });

  const seedMutation = useSeedStarterMenuCatalog(merchantId);

  const missingProteinsBeforeSeed: ProteinGroup[] = proteinQuery.data
    ? (["beef", "pork", "chicken"] as const).filter(
        (group) => !proteinQuery.data![group],
      )
    : [];

  const handleCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: MenuItemDto) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleSuccess = (message: string) => {
    setErrorMessage(null);
    setWarningMessage(null);
    setStatusMessage(message);
  };

  const handleReactivate = async (item: MenuItemDto) => {
    setReactivatingId(item.id);
    setStatusMessage(null);
    setWarningMessage(null);
    setErrorMessage(null);
    try {
      await reactivateMutation.mutateAsync(item.id);
      setStatusMessage("Ítem reactivado correctamente.");
    } catch (caughtError: unknown) {
      const mutationError = caughtError as { message?: string };
      setErrorMessage(
        mutationError.message ?? "No se pudo reactivar el ítem.",
      );
    } finally {
      setReactivatingId(null);
    }
  };

  const handleSeedStarter = async () => {
    setErrorMessage(null);
    setWarningMessage(null);
    setStatusMessage(null);

    try {
      const result = await seedMutation.mutateAsync();

      if (result.insertedCount === 0) {
        setStatusMessage(
          "El menú inicial ya estaba cargado; no se duplicaron ítems.",
        );
        return;
      }

      setStatusMessage(
        result.insertedCount === 1
          ? "Se cargó 1 ítem de menú inicial."
          : `Se cargaron ${result.insertedCount} ítems de menú inicial.`,
      );

      if (result.missingProteinGroups.length > 0) {
        setWarningMessage(
          `Faltan insumos de proteína (${formatMissingProteinGroups(result.missingProteinGroups)}). La merma, el costeo y el descuento en pedidos quedarán incompletos hasta vincular recetas. Carga insumos en Inventario o revisa Merma.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el menú inicial. Intenta de nuevo.";
      setErrorMessage(message);
    }
  };

  const hasVisibleRows =
    catalogQuery.data &&
    (showInactive
      ? catalogQuery.data.length > 0
      : catalogQuery.data.some((item) => item.isActive));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menú de venta</h1>
          <p className="text-sm text-muted-foreground">
            Administra platos, bebidas y contornos del asadero.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} disabled={!merchantId}>
          Nuevo ítem
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-inactive-menu-items"
          checked={showInactive}
          onCheckedChange={(checked) => setShowInactive(checked === true)}
        />
        <Label htmlFor="show-inactive-menu-items" className="font-normal">
          Mostrar inactivos
        </Label>
      </div>

      {statusMessage ? (
        <p role="status" className="text-sm text-primary">
          {statusMessage}
        </p>
      ) : null}

      {warningMessage ? (
        <div
          role="status"
          className="rounded-lg border border-border border-l-4 border-l-primary px-4 py-3 text-sm text-muted-foreground"
        >
          <p>{warningMessage}</p>
          <p className="mt-2 text-xs">
            <Link href="/inventory" className="text-primary underline-offset-4 hover:underline">
              Ir a Inventario
            </Link>
            {" · "}
            <Link href="/waste" className="text-primary underline-offset-4 hover:underline">
              Ir a Merma
            </Link>
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {catalogQuery.isLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Cargando menú…</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : catalogQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar el menú.
        </p>
      ) : hasVisibleRows && catalogQuery.data ? (
        <MenuItemTable
          items={catalogQuery.data}
          showInactive={showInactive}
          onEdit={handleEdit}
          onReactivate={handleReactivate}
          reactivatingId={reactivatingId}
        />
      ) : menuCatalogIsEmpty ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No hay ítems en el menú</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            Puedes crear ítems uno a uno o cargar el menú base del asadero (14
            ítems: carnes, bebidas y contornos).
          </p>
          {missingProteinsBeforeSeed.length > 0 ? (
            <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
              Para vincular recetas y merma automáticamente, registra insumos
              activos en kilogramos:{" "}
              {formatMissingProteinGroups(missingProteinsBeforeSeed)}. Puedes usar{" "}
              <Link
                href="/inventory"
                className="text-primary underline-offset-4 hover:underline"
              >
                Cargar insumos iniciales
              </Link>{" "}
              en Inventario o crearlos manualmente.
            </p>
          ) : null}
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={handleCreate}>
              Nuevo ítem
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSeedStarter}
              disabled={seedMutation.isPending || !merchantId}
            >
              {seedMutation.isPending
                ? "Cargando menú…"
                : "Cargar menú inicial"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No hay ítems en el menú.</p>
      )}

      {merchantId ? (
        <MenuItemFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          merchantId={merchantId}
          item={selectedItem}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
