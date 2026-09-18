import type { MenuItemKind, ProteinGroup } from "./entities";

/** Keep in sync with supabase/seeds/order_menu_catalog.sql */
export type StarterMenuItemDefinition = {
  name: string;
  itemKind: MenuItemKind;
  proteinGroup: ProteinGroup | null;
  weightLabel: string | null;
  price: number;
};

export const STARTER_MENU_ITEMS: readonly StarterMenuItemDefinition[] = [
  {
    name: "Beef 1 kg",
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "1kg",
    price: 44,
  },
  {
    name: "Beef 1/2 kg",
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "500g",
    price: 24,
  },
  {
    name: "Beef 1/4 kg",
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "250g",
    price: 13,
  },
  {
    name: "Pork belly 1 kg",
    itemKind: "meat_plate",
    proteinGroup: "pork",
    weightLabel: "1kg",
    price: 42,
  },
  {
    name: "Pork belly 1/2 kg",
    itemKind: "meat_plate",
    proteinGroup: "pork",
    weightLabel: "500g",
    price: 23,
  },
  {
    name: "Pork belly 1/4 kg",
    itemKind: "meat_plate",
    proteinGroup: "pork",
    weightLabel: "250g",
    price: 12,
  },
  {
    name: "Chicken 1 kg",
    itemKind: "meat_plate",
    proteinGroup: "chicken",
    weightLabel: "1kg",
    price: 38,
  },
  {
    name: "Chicken 1/2 kg",
    itemKind: "meat_plate",
    proteinGroup: "chicken",
    weightLabel: "500g",
    price: 21,
  },
  {
    name: "Chicken 1/4 kg",
    itemKind: "meat_plate",
    proteinGroup: "chicken",
    weightLabel: "250g",
    price: 11,
  },
  {
    name: "Nestea",
    itemKind: "drink",
    proteinGroup: null,
    weightLabel: null,
    price: 3.5,
  },
  {
    name: "Coca-Cola",
    itemKind: "drink",
    proteinGroup: null,
    weightLabel: null,
    price: 1.3,
  },
  {
    name: "Yuca",
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    price: 0,
  },
  {
    name: "Arepa",
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    price: 0,
  },
  {
    name: "Shredded salad",
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    price: 0,
  },
] as const;

/** SQL seed display names (order-independent parity checks). */
export const STARTER_MENU_ITEM_NAMES_FROM_SQL = [
  "Beef 1 kg",
  "Beef 1/2 kg",
  "Beef 1/4 kg",
  "Pork belly 1 kg",
  "Pork belly 1/2 kg",
  "Pork belly 1/4 kg",
  "Chicken 1 kg",
  "Chicken 1/2 kg",
  "Chicken 1/4 kg",
  "Nestea",
  "Coca-Cola",
  "Yuca",
  "Arepa",
  "Shredded salad",
] as const;

export function normalizeMenuItemName(name: string): string {
  return name.trim().toLowerCase();
}

/** Default cooking waste % — matches supabase/seeds/waste_cost_calculator.sql */
export function defaultWastePctForProteinGroup(proteinGroup: ProteinGroup): number {
  switch (proteinGroup) {
    case "beef":
      return 30;
    case "pork":
      return 25;
    case "chicken":
      return 20;
  }
}
