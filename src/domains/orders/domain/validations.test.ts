import { describe, expect, it } from "vitest";
import { createEmptyCart, type Cart, type MenuItem } from "./entities";
import { OrderError } from "./errors";
import { validateCartForSubmit } from "./validations";

const MERCHANT_ID = "11111111-1111-4111-8111-111111111111";
const BEEF_ID = "22222222-2222-4222-8222-222222222222";
const COCA_ID = "33333333-3333-4333-8333-333333333333";
const YUCA_ID = "44444444-4444-4444-8444-444444444444";
const AREPA_ID = "55555555-5555-4555-8555-555555555555";

const catalog: MenuItem[] = [
  {
    id: BEEF_ID,
    merchantId: MERCHANT_ID,
    name: "Beef 1/2 kg",
    price: 24,
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "500g",
    isActive: true,
  },
  {
    id: COCA_ID,
    merchantId: MERCHANT_ID,
    name: "Coca-Cola",
    price: 1.3,
    itemKind: "drink",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
  {
    id: YUCA_ID,
    merchantId: MERCHANT_ID,
    name: "Yuca",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
  {
    id: AREPA_ID,
    merchantId: MERCHANT_ID,
    name: "Arepa",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
];

function buildValidMeatCart(overrides: Partial<Cart> = {}): Cart {
  return {
    ...createEmptyCart(),
    lines: [
      {
        menuItemId: BEEF_ID,
        quantity: 1,
        unitPrice: 24,
        sides: [
          { slot: 1, sideMenuItemId: YUCA_ID },
          { slot: 2, sideMenuItemId: AREPA_ID },
        ],
      },
    ],
    ...overrides,
  };
}

describe("validateCartForSubmit", () => {
  it("accepts a valid meat plate with two sides", () => {
    const cart = buildValidMeatCart();
    expect(validateCartForSubmit(cart, catalog)).toEqual(cart);
  });

  it("accepts drinks without sides", () => {
    const cart: Cart = {
      ...createEmptyCart(),
      lines: [
        {
          menuItemId: COCA_ID,
          quantity: 1,
          unitPrice: 1.3,
          sides: [],
        },
      ],
    };

    expect(validateCartForSubmit(cart, catalog)).toEqual(cart);
  });

  it("rejects meat without two sides", () => {
    const cart = buildValidMeatCart({
      lines: [
        {
          menuItemId: BEEF_ID,
          quantity: 1,
          unitPrice: 24,
          sides: [{ slot: 1, sideMenuItemId: YUCA_ID }],
        },
      ],
    });

    expect(() => validateCartForSubmit(cart, catalog)).toThrow(OrderError);
  });

  it("requires delivery fee >= 0 for delivery", () => {
    const cart = buildValidMeatCart({
      serviceType: "delivery",
      deliveryFee: -1,
    });

    expect(() => validateCartForSubmit(cart, catalog)).toThrow(OrderError);
  });

  it("rejects non-zero delivery fee for takeaway", () => {
    const cart = buildValidMeatCart({
      deliveryFee: 2,
    });

    expect(() => validateCartForSubmit(cart, catalog)).toThrow(OrderError);
  });

  it("does not require table number", () => {
    const cart = buildValidMeatCart({ tableNumber: null });
    expect(validateCartForSubmit(cart, catalog).tableNumber).toBeNull();
  });
});
