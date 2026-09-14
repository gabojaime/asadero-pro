"use client";

import { useState } from "react";
import type { MeatPlateCostingRowDto } from "@/domains/waste/infrastructure/waste-costing-actions";
import { formatMoneyUsdEs } from "@/domains/orders/presentation/format-money";
import { Badge } from "@/shared/presentation/ui/badge";
import { Button } from "@/shared/presentation/ui/button";
import { Input } from "@/shared/presentation/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/ui/table";

type MeatPlateCostingTableProps = {
  rows: MeatPlateCostingRowDto[];
  savingMenuItemId: string | null;
  onSaveWastePct: (menuItemId: string, wastePct: number) => Promise<void>;
};

function configurationBadge(status: MeatPlateCostingRowDto["configurationStatus"]) {
  switch (status) {
    case "missing_recipe":
      return <Badge variant="outline">Sin receta</Badge>;
    case "zero_wac":
      return <Badge variant="outline">WAC en cero</Badge>;
    case "missing_waste_pct":
      return <Badge variant="outline">Sin merma</Badge>;
    default:
      return null;
  }
}

function WastePctEditor({
  row,
  saving,
  onSave,
}: {
  row: MeatPlateCostingRowDto;
  saving: boolean;
  onSave: (wastePct: number) => Promise<void>;
}) {
  const [value, setValue] = useState(
    row.wastePct == null ? "" : String(row.wastePct),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100) {
      setError("Ingresa un valor entre 0 y 99.99");
      return;
    }

    await onSave(parsed);
  };

  return (
    <div className="flex min-w-28 flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="decimal"
          aria-label={`Merma % para ${row.name}`}
          className="h-9 w-20"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "…" : "Guardar"}
        </Button>
      </div>
      {error ? <span className="text-xs text-primary">{error}</span> : null}
    </div>
  );
}

export function MeatPlateCostingTable({
  rows,
  savingMenuItemId,
  onSaveWastePct,
}: MeatPlateCostingTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Porción</TableHead>
            <TableHead>Precio actual</TableHead>
            <TableHead>Insumo</TableHead>
            <TableHead>WAC</TableHead>
            <TableHead>Receta (kg)</TableHead>
            <TableHead>Merma %</TableHead>
            <TableHead>Rendimiento %</TableHead>
            <TableHead>Costo real</TableHead>
            <TableHead>Precio recomendado</TableHead>
            <TableHead>Delta</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.menuItemId}>
              <TableCell className="font-semibold">{row.name}</TableCell>
              <TableCell>{row.weightLabel ?? "—"}</TableCell>
              <TableCell>{formatMoneyUsdEs(row.currentPrice)}</TableCell>
              <TableCell>{row.rawMaterialName ?? "—"}</TableCell>
              <TableCell>
                {row.unitCost != null ? formatMoneyUsdEs(row.unitCost) : "—"}
              </TableCell>
              <TableCell>
                {row.recipeQuantityKg != null ? `${row.recipeQuantityKg} kg` : "—"}
              </TableCell>
              <TableCell>
                <WastePctEditor
                  row={row}
                  saving={savingMenuItemId === row.menuItemId}
                  onSave={(wastePct) => onSaveWastePct(row.menuItemId, wastePct)}
                />
              </TableCell>
              <TableCell>
                {row.yieldPct != null ? `${row.yieldPct.toFixed(2)}%` : "—"}
              </TableCell>
              <TableCell>
                {row.realIngredientCost != null
                  ? formatMoneyUsdEs(row.realIngredientCost)
                  : "—"}
              </TableCell>
              <TableCell>
                {row.recommendedPrice != null
                  ? formatMoneyUsdEs(row.recommendedPrice)
                  : "—"}
              </TableCell>
              <TableCell>
                {row.priceDelta != null ? formatMoneyUsdEs(row.priceDelta) : "—"}
              </TableCell>
              <TableCell>{configurationBadge(row.configurationStatus)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
