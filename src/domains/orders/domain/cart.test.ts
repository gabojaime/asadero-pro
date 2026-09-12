import { describe, expect, it } from "vitest";
import {
  addLineToCart,
  computeItemsSubtotal,
  computeOrderTotal,
  removeLine,
  roundMoney,
  setServiceType,
  updateLineQuantity,
} from "./cart";
import { createEmptyCart, type CartLine } from "./entities";

const beefLine: CartLine = {
  menuItemId: "beef-500",
  quantity: 1,
  unitPrice: 24,
  sides: [
    { slot: 1, sideMenuItemId: "yuca" },
    { slot: 2, sideMenuItemId: "arepa" },
  ],
};

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });
});

describe("addLineToCart", () => {
  it("adds a new line immutably", () => {
    const cart = createEmptyCart();
    const next = addLineToCart(cart, beefLine);

    expect(cart.lines).toHaveLength(0);
    expect(next.lines).toHaveLength(1);
    expect(next.lines[0]).toEqual(beefLine);
  });

  it("merges duplicate lines with the same sides", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    const next = addLineToCart(cart, { ...beefLine, quantity: 2 });

    expect(next.lines).toHaveLength(1);
    expect(next.lines[0]?.quantity).toBe(3);
  });

  it("keeps separate lines when sides differ", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    const next = addLineToCart(cart, {
      ...beefLine,
      sides: [
        { slot: 1, sideMenuItemId: "yuca" },
        { slot: 2, sideMenuItemId: "yuca" },
      ],
    });

    expect(next.lines).toHaveLength(2);
  });
});

describe("updateLineQuantity", () => {
  it("updates quantity immutably", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    const next = updateLineQuantity(cart, 0, 4);

    expect(cart.lines[0]?.quantity).toBe(1);
    expect(next.lines[0]?.quantity).toBe(4);
  });

  it("removes the line when quantity is zero", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    const next = updateLineQuantity(cart, 0, 0);

    expect(next.lines).toHaveLength(0);
  });
});

describe("removeLine", () => {
  it("removes a line by index", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    const next = removeLine(cart, 0);

    expect(next.lines).toHaveLength(0);
  });
});

describe("computeItemsSubtotal", () => {
  it("sums line subtotals", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    const withDrink = addLineToCart(cart, {
      menuItemId: "coca",
      quantity: 2,
      unitPrice: 1.3,
      sides: [],
    });

    expect(computeItemsSubtotal(withDrink.lines)).toBe(26.6);
  });
});

describe("computeOrderTotal", () => {
  it("includes delivery fee for delivery orders", () => {
    const cart = {
      ...addLineToCart(createEmptyCart(), beefLine),
      serviceType: "delivery" as const,
      deliveryFee: 3.5,
    };

    expect(computeOrderTotal(cart)).toBe(27.5);
  });

  it("ignores delivery fee for takeaway", () => {
    const cart = addLineToCart(createEmptyCart(), beefLine);
    expect(computeOrderTotal(cart)).toBe(24);
  });
});

describe("setServiceType", () => {
  it("clears delivery fields when switching to takeaway", () => {
    const cart = {
      ...createEmptyCart(),
      serviceType: "delivery" as const,
      deliveryFee: 5,
      deliveryZone: "Centro",
    };

    const next = setServiceType(cart, "take_out");

    expect(next.serviceType).toBe("take_out");
    expect(next.deliveryFee).toBe(0);
    expect(next.deliveryZone).toBeNull();
  });
});
