import type { MenuItem } from "../../domain/entities";

export const TEST_MERCHANT_ID = "11111111-1111-4111-8111-111111111111";

export const BEEF_HALF_KG_ID = "22222222-2222-4222-8222-222222222222";
export const COCA_COLA_ID = "33333333-3333-4333-8333-333333333333";
export const YUCA_ID = "44444444-4444-4444-8444-444444444444";
export const AREPA_ID = "55555555-5555-4555-8555-555555555555";
export const ENSALADA_ID = "66666666-6666-4666-8666-666666666666";

export const menuCatalogFixture: MenuItem[] = [
  {
    id: BEEF_HALF_KG_ID,
    merchantId: TEST_MERCHANT_ID,
    name: "Beef 1/2 kg",
    price: 24,
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "500g",
    isActive: true,
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    merchantId: TEST_MERCHANT_ID,
    name: "Beef 1 kg",
    price: 44,
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "1kg",
    isActive: true,
  },
  {
    id: COCA_COLA_ID,
    merchantId: TEST_MERCHANT_ID,
    name: "Coca-Cola",
    price: 1.3,
    itemKind: "drink",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
  {
    id: YUCA_ID,
    merchantId: TEST_MERCHANT_ID,
    name: "Yuca",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
  {
    id: AREPA_ID,
    merchantId: TEST_MERCHANT_ID,
    name: "Arepa",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
  {
    id: ENSALADA_ID,
    merchantId: TEST_MERCHANT_ID,
    name: "Ensalada rallada",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
];

export function getSideMenuItems(): MenuItem[] {
  return menuCatalogFixture.filter((item) => item.itemKind === "side");
}

export function getMeatMenuItems(): MenuItem[] {
  return menuCatalogFixture.filter((item) => item.itemKind === "meat_plate");
}

export function getDrinkMenuItems(): MenuItem[] {
  return menuCatalogFixture.filter((item) => item.itemKind === "drink");
}
