import type { UserRole } from "@/domains/auth/domain/entities";
import type { CartLine, MenuItem, MvpServiceType, Order } from "./entities";

export interface MenuCatalogRepository {
  listActiveMenu(merchantId: string): Promise<MenuItem[]>;
}

export interface InsertOrderParams {
  merchantId: string;
  serverId: string;
  serviceType: MvpServiceType;
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
