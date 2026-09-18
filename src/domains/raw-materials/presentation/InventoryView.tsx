"use client";

import { useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import {
  useRawMaterials,
  useSeedStarterRawMaterials,
  type RawMaterialDto,
} from "@/domains/raw-materials/infrastructure/query-adapters";
import { Button } from "@/shared/presentation/ui/button";
import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { RawMaterialFormDialog } from "./RawMaterialFormDialog";
import { RawMaterialTable } from "./RawMaterialTable";
import { ReceiveStockDialog } from "./ReceiveStockDialog";

export function InventoryView() {
  const session = useSession();
  const merchantId = session.merchantId;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RawMaterialDto | null>(null);

  const materialsQuery = useRawMaterials(merchantId, { activeOnly: true });
  const activeItems = materialsQuery.data ?? [];
  const showActiveEmpty =
    !materialsQuery.isLoading &&
    !materialsQuery.isError &&
    activeItems.length === 0;

  const allMaterialsQuery = useRawMaterials(
    merchantId,
    { activeOnly: false },
    { enabled: showActiveEmpty },
  );
  const catalogIsEmpty =
    showActiveEmpty &&
    !allMaterialsQuery.isLoading &&
    !allMaterialsQuery.isError &&
    (allMaterialsQuery.data?.length ?? 0) === 0;

  const seedMutation = useSeedStarterRawMaterials(merchantId);

  const handleCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: RawMaterialDto) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleReceive = (item: RawMaterialDto) => {
    setSelectedItem(item);
    setReceiveOpen(true);
  };

  const handleSuccess = (message: string) => {
    setErrorMessage(null);
    setStatusMessage(message);
  };

  const handleSeedStarter = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await seedMutation.mutateAsync();
      if (result.insertedCount === 0) {
        setStatusMessage(
          "El catálogo inicial ya estaba cargado; no se duplicaron insumos.",
        );
        return;
      }

      setStatusMessage(
        result.insertedCount === 1
          ? "Se cargó 1 insumo inicial."
          : `Se cargaron ${result.insertedCount} insumos iniciales.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catálogo inicial. Intenta de nuevo.";
      setErrorMessage(message);
    }
  };

  const isEmptyStateLoading =
    showActiveEmpty &&
    (allMaterialsQuery.isLoading || allMaterialsQuery.isFetching);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inventario de insumos
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra el catálogo y registra entradas de stock.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} disabled={!merchantId}>
          Nuevo insumo
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

      {materialsQuery.isLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Cargando inventario…</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : materialsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar el inventario.
        </p>
      ) : activeItems.length > 0 ? (
        <RawMaterialTable
          items={activeItems}
          onEdit={handleEdit}
          onReceive={handleReceive}
        />
      ) : isEmptyStateLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Cargando inventario…</p>
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay insumos registrados
          </p>
          {catalogIsEmpty ? (
            <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
              Puedes crear insumos uno a uno o cargar el catálogo base de
              asadero (18 insumos, stock en cero).
            </p>
          ) : null}
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={handleCreate}>
              Nuevo insumo
            </Button>
            {catalogIsEmpty ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleSeedStarter}
                disabled={seedMutation.isPending || !merchantId}
              >
                {seedMutation.isPending
                  ? "Cargando insumos…"
                  : "Cargar insumos iniciales"}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {merchantId ? (
        <>
          <RawMaterialFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            merchantId={merchantId}
            item={selectedItem}
            onSuccess={handleSuccess}
          />
          <ReceiveStockDialog
            open={receiveOpen}
            onOpenChange={setReceiveOpen}
            merchantId={merchantId}
            item={selectedItem}
            onSuccess={handleSuccess}
          />
        </>
      ) : null}
    </div>
  );
}
