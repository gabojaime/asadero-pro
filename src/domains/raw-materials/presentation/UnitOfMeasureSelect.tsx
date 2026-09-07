"use client";

import type { UnitOfMeasure } from "@/domains/raw-materials/domain/entities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/ui/select";
import { formatUnitOfMeasureLabel } from "./formatters";

const UNIT_OPTIONS: UnitOfMeasure[] = ["kilogram", "unit"];

type UnitOfMeasureSelectProps = {
  value: UnitOfMeasure;
  onValueChange: (value: UnitOfMeasure) => void;
  disabled?: boolean;
  id?: string;
};

export function UnitOfMeasureSelect({
  value,
  onValueChange,
  disabled = false,
  id,
}: UnitOfMeasureSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as UnitOfMeasure)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label="Unidad de medida">
        <SelectValue placeholder="Selecciona unidad" />
      </SelectTrigger>
      <SelectContent>
        {UNIT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {formatUnitOfMeasureLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
