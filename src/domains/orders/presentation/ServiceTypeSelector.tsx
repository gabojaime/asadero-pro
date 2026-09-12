"use client";

import type { MvpServiceType } from "../domain/entities";
import { ORDER_COPY } from "./copy";
import { cn } from "@/lib/utils";

type ServiceTypeSelectorProps = {
  value: MvpServiceType;
  onChange: (value: MvpServiceType) => void;
};

export function ServiceTypeSelector({
  value,
  onChange,
}: ServiceTypeSelectorProps) {
  const options: Array<{ value: MvpServiceType; label: string }> = [
    { value: "take_out", label: ORDER_COPY.serviceTakeOut },
    { value: "delivery", label: ORDER_COPY.serviceDelivery },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold tracking-wide">Tipo de servicio</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-[15px] font-semibold transition-colors",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
