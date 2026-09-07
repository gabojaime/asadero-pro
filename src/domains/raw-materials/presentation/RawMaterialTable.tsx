"use client";

import { useEffect, useMemo, useState } from "react";

import type { RawMaterialDto } from "@/domains/raw-materials/infrastructure/query-adapters";
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
  DEFAULT_PAGE_SIZE,
  TablePagination,
  type PageSizeOption,
} from "@/shared/presentation/ui/table-pagination";
import { QuantityDisplay } from "./QuantityDisplay";
import {
  formatCurrency,
  formatDateTime,
  formatUnitOfMeasureLabel,
} from "./formatters";

type RawMaterialTableProps = {
  items: RawMaterialDto[];
  onEdit: (item: RawMaterialDto) => void;
  onReceive: (item: RawMaterialDto) => void;
};

export function RawMaterialTable({
  items,
  onEdit,
  onReceive,
}: RawMaterialTableProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [items.length, pageIndex, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = pageIndex * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageIndex, pageSize]);

  const handlePageSizeChange = (nextPageSize: PageSizeOption) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Cantidad en stock</TableHead>
            <TableHead>Costo unitario</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.sku ?? "—"}
              </TableCell>
              <TableCell>{formatUnitOfMeasureLabel(item.unitOfMeasure as "kilogram" | "unit")}</TableCell>
              <TableCell>
                <QuantityDisplay
                  quantity={item.quantityOnHand}
                  unitOfMeasure={item.unitOfMeasure as "kilogram" | "unit"}
                />
              </TableCell>
              <TableCell>
                {formatCurrency(item.unitCost)}
                <span className="ml-1 text-xs text-muted-foreground">
                  / {item.unitOfMeasure === "kilogram" ? "kg" : "pz"}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(item.updatedAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onReceive(item)}
                  >
                    Registrar entrada
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item)}
                  >
                    Editar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalItems={items.length}
        onPageChange={setPageIndex}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
