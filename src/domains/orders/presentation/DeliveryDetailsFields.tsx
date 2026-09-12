"use client";

import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";
import { ORDER_COPY } from "./copy";
import { MoneyAmountInput } from "./MoneyAmountInput";

const DELIVERY_ZONE_MAX_LENGTH = 100;

type DeliveryDetailsFieldsProps = {
  deliveryZone: string | null;
  deliveryFee: number;
  feeError?: string | null;
  onZoneChange: (value: string) => void;
  onZoneBlur: () => void;
  onFeeChange: (value: number) => void;
};

export function DeliveryDetailsFields({
  deliveryZone,
  deliveryFee,
  feeError,
  onZoneChange,
  onZoneBlur,
  onFeeChange,
}: DeliveryDetailsFieldsProps) {
  const feeErrorId = feeError ? "delivery-fee-error" : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="delivery-zone">{ORDER_COPY.deliveryZoneLabel}</Label>
        <Input
          id="delivery-zone"
          value={deliveryZone ?? ""}
          maxLength={DELIVERY_ZONE_MAX_LENGTH}
          onChange={(event) => onZoneChange(event.target.value)}
          onBlur={onZoneBlur}
          placeholder="Las Mercedes"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="delivery-fee">{ORDER_COPY.deliveryFeeLabel}</Label>
        <MoneyAmountInput
          id="delivery-fee"
          value={Number.isFinite(deliveryFee) ? deliveryFee : 0}
          onChange={onFeeChange}
          aria-invalid={Boolean(feeError)}
          aria-describedby={feeErrorId}
        />
        {feeError ? (
          <p id={feeErrorId} className="text-[13px] text-primary">
            {feeError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
