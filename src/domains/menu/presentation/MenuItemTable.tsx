"use client";

import { Fragment } from "react";
import type { MenuItemDto } from "@/domains/menu/infrastructure/query-adapters";
import type { MenuItemKind } from "@/domains/menu/domain/entities";
import { Badge } from "@/shared/presentation/ui/badge";
import { Button } from "@/shared/presentation/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/ui/table";
import {
  formatMenuItemKindLabel,
  formatMenuItemKindSectionHeader,
  formatProteinGroupLabel,
} from "./labels";
import { MenuPriceDisplay } from "./MenuPriceDisplay";

type MenuItemTableProps = {
  items: MenuItemDto[];
  showInactive: boolean;
  onEdit: (item: MenuItemDto) => void;
  onReactivate: (item: MenuItemDto) => void;
  reactivatingId: string | null;
};

const KIND_ORDER: MenuItemKind[] = ["meat_plate", "drink", "side"];

function formatPortion(item: MenuItemDto): string {
  if (item.itemKind !== "meat_plate") {
    return "—";
  }

  const protein = item.proteinGroup
    ? formatProteinGroupLabel(item.proteinGroup as "beef" | "pork" | "chicken")
    : "—";
  const weight = item.weightLabel ?? "—";
  return `${protein} · ${weight}`;
}

export function MenuItemTable({
  items,
  showInactive,
  onEdit,
  onReactivate,
  reactivatingId,
}: MenuItemTableProps) {
  const visibleItems = showInactive
    ? items
    : items.filter((item) => item.isActive);

  const itemsByKind = KIND_ORDER.map((kind) => ({
    kind,
    rows: visibleItems.filter((item) => item.itemKind === kind),
  })).filter((section) => section.rows.length > 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Proteína / porción</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itemsByKind.map((section) => (
            <Fragment key={section.kind}>
              <TableRow className="bg-muted/40">
                <TableCell
                  colSpan={6}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {formatMenuItemKindSectionHeader(section.kind)}
                </TableCell>
              </TableRow>
              {section.rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatMenuItemKindLabel(item.itemKind as MenuItemKind)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatPortion(item)}
                  </TableCell>
                  <TableCell>
                    <MenuPriceDisplay amount={item.price} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.isActive ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(item)}
                      >
                        Editar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={reactivatingId === item.id}
                        onClick={() => onReactivate(item)}
                      >
                        Reactivar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
