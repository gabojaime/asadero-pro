import type { UserRole } from "@/domains/auth/domain/entities";
import type {
  CartLine,
  MenuItem,
  MerchantKitchenSettings,
  MvpServiceType,
  Order,
  OrderFulfillmentTiming,
} from "./entities";

export interface MerchantKitchenSettingsRepository {
  getKitchenSettings(merchantId: string): Promise<MerchantKitchenSettings>;
}

export interface MenuCatalogRepository {
  listActiveMenu(merchantId: string): Promise<MenuItem[]>;
}

export interface InsertOrderParams {
  merchantId: string;
  serverId: string;
  serviceType: MvpServiceType;
  fulfillmentTiming: OrderFulfillmentTiming;
  readyByAt: Date | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  deliveryFee: number;
  deliveryZone: string | null;
  lines: CartLine[];
  menuCatalog: MenuItem[];
  totalAmount: number;
}

export interface MarkOrderReadyParams {
  merchantId: string;
  orderId: string;
  actorRole: UserRole;
}

export interface OrderRepository {
  insertOrder(params: InsertOrderParams): Promise<Order>;
  listActiveOrders(merchantId: string): Promise<Order[]>;
  listServedOrders(merchantId: string): Promise<Order[]>;
  getOrderById(merchantId: string, orderId: string): Promise<Order | null>;
  markReady(params: MarkOrderReadyParams): Promise<Order>;
}
