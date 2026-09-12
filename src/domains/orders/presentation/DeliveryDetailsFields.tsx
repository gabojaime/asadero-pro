"use client";

import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";
import { ORDER_COPY } from "./copy";

type DeliveryDetailsFieldsProps = {
  deliveryZone: string | null;
  deliveryFee: number;
  feeError?: string | null;
  onZoneChange: (value: string) => void;
  onFeeChange: (value: number) => void;
};

export function DeliveryDetailsFields({
  deliveryZone,
  deliveryFee,
  feeError,
  onZoneChange,
  onFeeChange,
}: DeliveryDetailsFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="delivery-zone">{ORDER_COPY.deliveryZoneLabel}</Label>
        <Input
          id="delivery-zone"
          value={deliveryZone ?? ""}
          onChange={(event) => onZoneChange(event.target.value)}
          placeholder="Centro"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="delivery-fee">{ORDER_COPY.deliveryFeeLabel}</Label>
        <Input
          id="delivery-fee"
          type="number"
          min={0}
          step={0.01}
          value={Number.isFinite(deliveryFee) ? deliveryFee : 0}
          onChange={(event) => onFeeChange(Number(event.target.value))}
        />
        {feeError ? (
          <p className="text-[13px] text-primary">{feeError}</p>
        ) : null}
      </div>
    </div>
  );
}
