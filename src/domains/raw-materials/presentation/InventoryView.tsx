"use client";

import { useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import {
  useRawMaterials,
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
  const [formOpen, setFormOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RawMaterialDto | null>(null);

  const materialsQuery = useRawMaterials(merchantId, { activeOnly: true });

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
    setStatusMessage(message);
  };

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
      ) : materialsQuery.data && materialsQuery.data.length > 0 ? (
        <RawMaterialTable
          items={materialsQuery.data}
          onEdit={handleEdit}
          onReceive={handleReceive}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay insumos registrados
          </p>
          <Button type="button" className="mt-4" onClick={handleCreate}>
            Nuevo insumo
          </Button>
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
