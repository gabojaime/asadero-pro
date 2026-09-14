import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type {
  MenuItem,
  Order,
  OrderItemSide,
  OrderLine,
  OrderStatus,
  ServiceType,
} from "../domain/entities";
import { OrderError } from "../domain/errors";
import {
  assertCanMarkReady,
  isActiveKitchenOrder,
  markOrderReady as markOrderReadyDomain,
} from "../domain/order-status";
import type { InsertOrderParams, OrderRepository } from "../domain/repository";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

type OrderItemWithRelations = Database["public"]["Tables"]["order_items"]["Row"] & {
  menu_items: Pick<
    Database["public"]["Tables"]["menu_items"]["Row"],
    "name"
  > | null;
  order_item_sides: Array<
    Database["public"]["Tables"]["order_item_sides"]["Row"] & {
      menu_items: Pick<
        Database["public"]["Tables"]["menu_items"]["Row"],
        "name"
      > | null;
    }
  >;
};

type OrderWithRelations = OrderRow & {
  users: Pick<Database["public"]["Tables"]["users"]["Row"], "full_name"> | null;
  order_items: OrderItemWithRelations[];
};

const ACTIVE_ORDER_SELECT = `
  *,
  users(full_name),
  order_items(
    id,
    menu_item_id,
    quantity,
    unit_price,
    subtotal,
    menu_items(name),
    order_item_sides(
      slot,
      side_menu_item_id,
      menu_items(name)
    )
  )
`;

function mapOrderLine(item: OrderItemWithRelations): OrderLine {
  const sides: OrderItemSide[] = (item.order_item_sides ?? [])
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((side) => ({
      slot: side.slot as 1 | 2,
      sideMenuItemId: side.side_menu_item_id,
      sideName: side.menu_items?.name ?? "",
    }));

  return {
    id: item.id,
    menuItemId: item.menu_item_id,
    name: item.menu_items?.name ?? "",
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    subtotal: Number(item.subtotal),
    sides,
  };
}

function mapOrderRow(row: OrderWithRelations): Order {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    serverId: row.server_id,
    serverName: row.users?.full_name ?? null,
    tableNumber: row.table_number,
    serviceType: row.service_type as ServiceType,
    deliveryFee: Number(row.delivery_fee),
    deliveryZone: row.delivery_zone,
    status: row.status as OrderStatus,
    totalAmount: Number(row.total_amount),
    sentToKitchenAt: new Date(row.sent_to_kitchen_at ?? row.created_at),
    readyAt: row.ready_at ? new Date(row.ready_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lines: (row.order_items ?? []).map(mapOrderLine),
  };
}

function findMenuItem(catalog: MenuItem[], menuItemId: string): MenuItem {
  const item = catalog.find((entry) => entry.id === menuItemId);
  if (!item) {
    throw new OrderError("validation_failed", "Artículo de menú inválido.");
  }
  return item;
}

export function createOrderRepository(
  supabase: SupabaseClient<Database>,
): OrderRepository {
  return {
    async insertOrder(params: InsertOrderParams) {
      for (const line of params.lines) {
        findMenuItem(params.menuCatalog, line.menuItemId);
      }

      const rpcLines = params.lines.map((line) => ({
        menu_item_id: line.menuItemId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        subtotal: line.unitPrice * line.quantity,
        sides: line.sides.map((side) => ({
          slot: side.slot,
          side_menu_item_id: side.sideMenuItemId,
        })),
      }));

      const { data: orderId, error: rpcError } = await supabase.rpc(
        "create_order_with_items",
        {
          p_service_type: params.serviceType,
          p_delivery_fee: params.deliveryFee,
          p_delivery_zone: params.deliveryZone,
          p_total_amount: params.totalAmount,
          p_lines: rpcLines,
        },
      );

      if (rpcError || !orderId) {
        throw rpcError ?? new Error("Failed to insert order");
      }

      const { data: fullOrder, error: fetchError } = await supabase
        .from("orders")
        .select(ACTIVE_ORDER_SELECT)
        .eq("id", orderId)
        .single();

      if (fetchError || !fullOrder) {
        throw fetchError ?? new Error("Failed to fetch inserted order");
      }

      return mapOrderRow(fullOrder as OrderWithRelations);
    },

    async listActiveOrders(merchantId) {
      const { data, error } = await supabase
        .from("orders")
        .select(ACTIVE_ORDER_SELECT)
        .eq("merchant_id", merchantId)
        .in("status", ["pending", "cooking"])
        .order("sent_to_kitchen_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapOrderRow(row as OrderWithRelations));
    },

    async listServedOrders(merchantId) {
      const { data, error } = await supabase
        .from("orders")
        .select(ACTIVE_ORDER_SELECT)
        .eq("merchant_id", merchantId)
        .eq("status", "served")
        .order("ready_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapOrderRow(row as OrderWithRelations));
    },

    async getOrderById(merchantId, orderId) {
      const { data, error } = await supabase
        .from("orders")
        .select(ACTIVE_ORDER_SELECT)
        .eq("id", orderId)
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapOrderRow(data as OrderWithRelations) : null;
    },

    async markReady(params) {
      assertCanMarkReady(params.actorRole);

      const { data: existing, error: fetchError } = await supabase
        .from("orders")
        .select(ACTIVE_ORDER_SELECT)
        .eq("id", params.orderId)
        .eq("merchant_id", params.merchantId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!existing) {
        throw new OrderError("not_found", "Pedido no encontrado.");
      }

      const current = mapOrderRow(existing as OrderWithRelations);
      if (!isActiveKitchenOrder(current.status)) {
        throw new OrderError(
          "order_not_active",
          "El pedido no está disponible en cocina.",
        );
      }

      const now = new Date();
      const next = markOrderReadyDomain(current, now);

      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
          status: next.status,
          ready_at: next.readyAt?.toISOString() ?? null,
          updated_at: next.updatedAt.toISOString(),
        })
        .eq("id", params.orderId)
        .eq("merchant_id", params.merchantId)
        .select(ACTIVE_ORDER_SELECT)
        .single();

      if (updateError || !updated) {
        throw updateError ?? new Error("Failed to mark order ready");
      }

      return mapOrderRow(updated as OrderWithRelations);
    },
  };
}
