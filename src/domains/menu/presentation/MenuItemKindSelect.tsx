"use client";

import type { MenuItemKind } from "@/domains/menu/domain/entities";
import { Label } from "@/shared/presentation/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/ui/select";
import { formatMenuItemKindLabel } from "./labels";

const KIND_OPTIONS: MenuItemKind[] = ["meat_plate", "drink", "side"];

type MenuItemKindSelectProps = {
  id: string;
  value: MenuItemKind;
  onChange: (value: MenuItemKind) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function MenuItemKindSelect({
  id,
  value,
  onChange,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: MenuItemKindSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Tipo</Label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as MenuItemKind)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          <SelectValue placeholder="Selecciona un tipo" />
        </SelectTrigger>
        <SelectContent>
          {KIND_OPTIONS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {formatMenuItemKindLabel(kind)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
