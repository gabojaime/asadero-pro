export type OrderStatus =
  | "pending"
  | "cooking"
  | "served"
  | "completed"
  | "cancelled";

/** MVP cart/UI allows take_out | delivery only. dine_in reserved for future. */
export type MvpServiceType = "take_out" | "delivery";
export type ServiceType = "dine_in" | "take_out" | "delivery";

export type OrderFulfillmentTiming = "immediate" | "scheduled";

export type KitchenPriorityTier = "urgent" | "deferred";

export const DEFAULT_KITCHEN_PRIORITY_HORIZON_MINUTES = 45;

export type MerchantKitchenSettings = {
  timezone: string;
  kitchenPriorityHorizonMinutes: number;
};

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
  fulfillmentTiming: OrderFulfillmentTiming;
  readyByAt: Date | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
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
  fulfillmentTiming: OrderFulfillmentTiming;
  readyByAt: Date | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  sentToKitchenAt: Date;
  readyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: OrderLine[];
};

export function createEmptyCart(): Cart {
  return {
    serviceType: "take_out",
    fulfillmentTiming: "immediate",
    readyByAt: null,
    customerFirstName: null,
    customerLastName: null,
    customerPhone: null,
    deliveryFee: 0,
    deliveryZone: null,
    tableNumber: null,
    lines: [],
  };
}
