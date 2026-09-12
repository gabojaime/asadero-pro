export type OrderStatus =
  | "pending"
  | "cooking"
  | "served"
  | "completed"
  | "cancelled";

/** MVP cart/UI allows take_out | delivery only. dine_in reserved for future. */
export type MvpServiceType = "take_out" | "delivery";
export type ServiceType = "dine_in" | "take_out" | "delivery";

export type MenuItemKind = "meat_plate" | "drink" | "side";

export type ProteinGroup = "beef" | "pork" | "chicken";

export type MenuItem = {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: MenuItemKind;
  proteinGroup: ProteinGroup | null;
  weightLabel: string | null;
  isActive: boolean;
};

export type CartSideSelection = {
  slot: 1 | 2;
  sideMenuItemId: string;
};

export type CartLine = {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  sides: CartSideSelection[];
};

export type Cart = {
  serviceType: MvpServiceType;
  deliveryFee: number;
  deliveryZone: string | null;
  tableNumber: null;
  lines: CartLine[];
};

export type OrderItemSide = {
  slot: 1 | 2;
  sideMenuItemId: string;
  sideName: string;
};

export type OrderLine = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sides: OrderItemSide[];
};

export type Order = {
  id: string;
  merchantId: string;
  serverId: string | null;
  serverName: string | null;
  tableNumber: number | null;
  serviceType: ServiceType;
  deliveryFee: number;
  deliveryZone: string | null;
  status: OrderStatus;
  totalAmount: number;
  sentToKitchenAt: Date;
  readyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: OrderLine[];
};

export function createEmptyCart(): Cart {
  return {
    serviceType: "take_out",
    deliveryFee: 0,
    deliveryZone: null,
    tableNumber: null,
    lines: [],
  };
}
