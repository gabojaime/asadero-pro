export type ActionFailure = {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type MenuItemDto = {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  isActive: boolean;
};

export type OrderItemSideDto = {
  slot: 1 | 2;
  sideMenuItemId: string;
  sideName: string;
};

export type OrderLineDto = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sides: OrderItemSideDto[];
};

export type OrderDto = {
  id: string;
  merchantId: string;
  serverId: string | null;
  serverName: string | null;
  tableNumber: number | null;
  serviceType: string;
  deliveryFee: number;
  deliveryZone: string | null;
  status: string;
  totalAmount: number;
  fulfillmentTiming: string;
  readyByAt: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  sentToKitchenAt: string;
  readyAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: OrderLineDto[];
};
