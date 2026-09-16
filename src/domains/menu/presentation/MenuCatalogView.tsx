"use client";

import { useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import {
  useMenuCatalog,
  useReactivateMenuItem,
  type MenuItemDto,
} from "@/domains/menu/infrastructure/query-adapters";
import { Button } from "@/shared/presentation/ui/button";
import { Checkbox } from "@/shared/presentation/ui/checkbox";
import { Label } from "@/shared/presentation/ui/label";
import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { MenuItemFormDialog } from "./MenuItemFormDialog";
import { MenuItemTable } from "./MenuItemTable";

export function MenuCatalogView() {
  const session = useSession();
  const merchantId = session.merchantId;
  const [showInactive, setShowInactive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemDto | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const catalogQuery = useMenuCatalog(merchantId, { activeOnly: false });
  const reactivateMutation = useReactivateMenuItem(merchantId);

  const handleCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: MenuItemDto) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleSuccess = (message: string) => {
    setStatusMessage(message);
  };

  const handleReactivate = async (item: MenuItemDto) => {
    setReactivatingId(item.id);
    setStatusMessage(null);
    try {
      await reactivateMutation.mutateAsync(item.id);
      setStatusMessage("Ítem reactivado correctamente.");
    } catch (caughtError: unknown) {
      const mutationError = caughtError as { message?: string };
      setStatusMessage(
        mutationError.message ?? "No se pudo reactivar el ítem.",
      );
    } finally {
      setReactivatingId(null);
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
