"use client";

import type { ProteinGroup } from "@/domains/menu/domain/entities";
import { Label } from "@/shared/presentation/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/ui/select";
import { formatProteinGroupLabel } from "./labels";

const PROTEIN_OPTIONS: ProteinGroup[] = ["beef", "pork", "chicken"];

type ProteinGroupSelectProps = {
  id: string;
  value: ProteinGroup | null;
  onChange: (value: ProteinGroup) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function ProteinGroupSelect({
  id,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ProteinGroupSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Proteína</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(next) => onChange(next as ProteinGroup)}
      >
        <SelectTrigger
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          <SelectValue placeholder="Selecciona proteína" />
        </SelectTrigger>
        <SelectContent>
          {PROTEIN_OPTIONS.map((group) => (
            <SelectItem key={group} value={group}>
              {formatProteinGroupLabel(group)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
