import type { Cart, CartLine, CartSideSelection, MvpServiceType } from "./entities";

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function sidesKey(sides: CartSideSelection[]): string {
  return [...sides]
    .sort((a, b) => a.slot - b.slot)
    .map((side) => `${side.slot}:${side.sideMenuItemId}`)
    .join("|");
}

export function addLineToCart(cart: Cart, line: CartLine): Cart {
  const index = cart.lines.findIndex(
    (existing) =>
      existing.menuItemId === line.menuItemId &&
      sidesKey(existing.sides) === sidesKey(line.sides),
  );

  if (index !== -1) {
    return {
      ...cart,
      lines: cart.lines.map((existing, lineIndex) =>
        lineIndex === index
          ? { ...existing, quantity: existing.quantity + line.quantity }
          : existing,
      ),
    };
  }

  return { ...cart, lines: [...cart.lines, line] };
}

export function updateLineQuantity(
  cart: Cart,
  lineIndex: number,
  quantity: number,
): Cart {
  if (quantity <= 0) {
    return removeLine(cart, lineIndex);
  }

  return {
    ...cart,
    lines: cart.lines.map((line, index) =>
      index === lineIndex ? { ...line, quantity } : line,
    ),
  };
}

export function removeLine(cart: Cart, lineIndex: number): Cart {
  return {
    ...cart,
    lines: cart.lines.filter((_, index) => index !== lineIndex),
  };
}

export function computeItemsSubtotal(lines: CartLine[]): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
}

export function computeOrderTotal(cart: Cart): number {
  const itemsSubtotal = computeItemsSubtotal(cart.lines);
  const fee = cart.serviceType === "delivery" ? cart.deliveryFee : 0;
  return roundMoney(itemsSubtotal + fee);
}

export function setServiceType(cart: Cart, serviceType: MvpServiceType): Cart {
  if (serviceType === "take_out") {
    return { ...cart, serviceType, deliveryFee: 0, deliveryZone: null };
  }

  return { ...cart, serviceType };
}

export function setDeliveryFee(cart: Cart, deliveryFee: number): Cart {
  return { ...cart, deliveryFee };
}

export function setDeliveryZone(cart: Cart, deliveryZone: string | null): Cart {
  return { ...cart, deliveryZone };
}
