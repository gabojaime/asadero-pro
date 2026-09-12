"use client";

import type { Cart, CartLine } from "../domain/entities";
import { computeItemsSubtotal, computeOrderTotal } from "../domain/cart";
import { ORDER_COPY } from "./copy";
import { formatMoneyUsdEs } from "./format-money";
import { Button } from "@/shared/presentation/ui/button";

type CartPanelProps = {
  cart: Cart;
  menuNames: Record<string, string>;
  menuWeightLabels: Record<string, string | null>;
  sideNames: Record<string, string>;
  isSubmitting: boolean;
  submitError?: string | null;
  onIncrement: (lineIndex: number) => void;
  onDecrement: (lineIndex: number) => void;
  onRemove: (lineIndex: number) => void;
  onSubmit: () => void;
};

function renderSideCaption(line: CartLine, sideNames: Record<string, string>) {
  if (line.sides.length === 0) {
    return null;
  }

  return line.sides
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((side) => sideNames[side.sideMenuItemId] ?? "")
    .filter(Boolean)
    .join(" · ");
}

export function CartPanel({
  cart,
  menuNames,
  menuWeightLabels,
  sideNames,
  isSubmitting,
  submitError,
  onIncrement,
  onDecrement,
  onRemove,
  onSubmit,
}: CartPanelProps) {
  const itemsSubtotal = computeItemsSubtotal(cart.lines);
  const total = computeOrderTotal(cart);
  const canSubmit = cart.lines.length > 0 && !isSubmitting;

  return (
    <div className="sticky bottom-0 border-t border-border bg-background p-4">
      <div className="flex flex-col gap-4">
        {cart.lines.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Agrega artículos al carrito.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cart.lines.map((line, index) => {
              const sideCaption = renderSideCaption(line, sideNames);
              return (
                <li
                  key={`${line.menuItemId}-${index}`}
                  className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">
                      {menuNames[line.menuItemId]}
                    </p>
                    {menuWeightLabels[line.menuItemId] ? (
                      <p className="text-[13px] text-muted-foreground">
                        {menuWeightLabels[line.menuItemId]}
                      </p>
                    ) : null}
                    {sideCaption ? (
                      <p className="text-[13px] text-muted-foreground">
                        {sideCaption}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDecrement(index)}
                      >
                        -
                      </Button>
                      <span className="min-w-6 text-center text-[15px] font-semibold">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onIncrement(index)}
                      >
                        +
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(index)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                  <p className="text-[15px] font-semibold">
                    {formatMoneyUsdEs(line.unitPrice * line.quantity)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-1 text-[15px]">
          <div className="flex items-center justify-between">
            <span>{ORDER_COPY.itemsSubtotal}</span>
            <span>{formatMoneyUsdEs(itemsSubtotal)}</span>
          </div>
          {cart.serviceType === "delivery" ? (
            <div className="flex items-center justify-between">
              <span>{ORDER_COPY.deliveryFeeLine}</span>
              <span>{formatMoneyUsdEs(cart.deliveryFee)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between font-semibold">
            <span>{ORDER_COPY.total}</span>
            <span>{formatMoneyUsdEs(total)}</span>
          </div>
        </div>

        {submitError ? (
          <p className="text-[13px] text-primary">{submitError}</p>
        ) : null}

        <Button
          type="button"
          className="min-h-11"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {ORDER_COPY.sendToKitchen}
        </Button>
      </div>
    </div>
  );
}
