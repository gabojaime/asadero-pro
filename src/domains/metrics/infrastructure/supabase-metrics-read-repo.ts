import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type { MerchantDashboardSettings } from "../domain/entities";
import type {
  CompletedOrderRow,
  InventoryMovementRow,
  MetricsReadRepository,
  OrderItemContributionRow,
  RecipeCostRow,
  TableSessionRow,
  WasteLogRow,
} from "../domain/repository";

type DbClient = SupabaseClient<Database>;

function revenueTimestamp(row: {
  inventory_deducted_at: string | null;
  updated_at: string;
}): string {
  return row.inventory_deducted_at ?? row.updated_at;
}

function sessionDayHour(closedAtIso: string): { dayOfWeek: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(closedAtIso));

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { dayOfWeek: map[weekday] ?? 0, hour };
}

export function createMetricsReadRepository(
  supabase: DbClient,
): MetricsReadRepository {
  return {
    async getMerchantSettings(merchantId) {
      const { data, error } = await supabase
        .from("merchants")
        .select(
          "target_food_cost_pct, monthly_fixed_overhead, seating_table_count",
        )
        .eq("id", merchantId)
        .single();

      if (error || !data) {
        throw error ?? new Error("Merchant not found");
      }

      return {
        targetFoodCostPct: Number(data.target_food_cost_pct),
        monthlyFixedOverhead:
          data.monthly_fixed_overhead === null
            ? null
            : Number(data.monthly_fixed_overhead),
        seatingTableCount:
          data.seating_table_count === null
            ? null
            : Number(data.seating_table_count),
      } satisfies MerchantDashboardSettings;
    },

    async listCompletedOrders(merchantId, bounds) {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_amount, inventory_deducted_at, updated_at, sent_to_kitchen_at, ready_at, created_at",
        )
        .eq("merchant_id", merchantId)
        .eq("status", "completed")
        .gte("inventory_deducted_at", bounds.startIso)
        .lt("inventory_deducted_at", bounds.endIso);

      if (error) {
        throw error;
      }

      const fallback = await supabase
        .from("orders")
        .select(
          "id, total_amount, inventory_deducted_at, updated_at, sent_to_kitchen_at, ready_at, created_at",
        )
        .eq("merchant_id", merchantId)
        .eq("status", "completed")
        .is("inventory_deducted_at", null)
        .gte("updated_at", bounds.startIso)
        .lt("updated_at", bounds.endIso);

      if (fallback.error) {
        throw fallback.error;
      }

      const merged = [...(data ?? []), ...(fallback.data ?? [])];
      const seen = new Set<string>();

      return merged
        .filter((row) => {
          if (seen.has(row.id)) {
            return false;
          }
          seen.add(row.id);
          return true;
        })
        .map(
          (row): CompletedOrderRow => ({
            id: row.id,
            totalAmount: Number(row.total_amount),
            revenueAtIso: revenueTimestamp(row),
            sentToKitchenAt: row.sent_to_kitchen_at,
            readyAt: row.ready_at,
            createdAt: row.created_at,
          }),
        );
    },

    async listInventoryMovements(merchantId, bounds) {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(
          "movement_type, quantity, unit_cost, created_at, raw_materials_inventory(unit_of_measure)",
        )
        .eq("merchant_id", merchantId)
        .gte("created_at", bounds.startIso)
        .lt("created_at", bounds.endIso);

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => {
        const joined = row.raw_materials_inventory as
          | { unit_of_measure: "kilogram" | "unit" }
          | { unit_of_measure: "kilogram" | "unit" }[]
          | null;
        const unitRow = Array.isArray(joined) ? joined[0] : joined;
        return {
          movementType: row.movement_type,
          quantity: Number(row.quantity),
          unitCost: Number(row.unit_cost),
          createdAt: row.created_at,
          unitOfMeasure: unitRow?.unit_of_measure ?? null,
        } satisfies InventoryMovementRow;
      });
    },

    async listWasteLogs(merchantId, bounds) {
      const { data, error } = await supabase
        .from("waste_logs")
        .select("total_cost, weight_kg, reason, created_at")
        .eq("merchant_id", merchantId)
        .gte("created_at", bounds.startIso)
        .lt("created_at", bounds.endIso);

      if (error) {
        throw error;
      }

      return (data ?? []).map(
        (row): WasteLogRow => ({
          totalCost: Number(row.total_cost),
          weightKg: Number(row.weight_kg),
          reason: row.reason,
          createdAt: row.created_at,
        }),
      );
    },

    async listMeatPlateOrderItems(merchantId, bounds) {
      const orders = await this.listCompletedOrders(merchantId, bounds);
      const orderIds = orders.map((row) => row.id);
      if (orderIds.length === 0) {
        return [];
      }

      const revenueByOrder = new Map(
        orders.map((row) => [row.id, row.revenueAtIso]),
      );

      const { data, error } = await supabase
        .from("order_items")
        .select(
          "order_id, quantity, subtotal, menu_item_id, menu_items(name, protein_group, weight_label, item_kind, merchant_id)",
        )
        .in("order_id", orderIds);

      if (error) {
        throw error;
      }

      return (data ?? [])
        .filter((row) => {
          const menu = row.menu_items as { merchant_id: string };
          return menu.merchant_id === merchantId;
        })
        .map((row): OrderItemContributionRow => {
          const menu = row.menu_items as {
            name: string;
            protein_group: string | null;
            weight_label: string | null;
            item_kind: string;
          };
          return {
            menuItemId: row.menu_item_id,
            name: menu.name,
            proteinGroup: menu.protein_group,
            weightLabel: menu.weight_label,
            itemKind: menu.item_kind,
            quantity: row.quantity,
            subtotal: Number(row.subtotal),
            revenueAtIso: revenueByOrder.get(row.order_id) ?? bounds.startIso,
          };
        });
    },

    async listRecipeCosts(merchantId) {
      const { data: recipes, error: recipeError } = await supabase
        .from("recipe_ingredients")
        .select(
          "menu_item_id, quantity_kg, raw_material_id, menu_items!inner(merchant_id), raw_materials_inventory!inner(unit_cost)",
        )
        .eq("menu_items.merchant_id", merchantId);

      if (recipeError) {
        throw recipeError;
      }

      const { data: costingRows, error: costingError } = await supabase
        .from("menu_item_costing")
        .select("menu_item_id, waste_pct")
        .eq("merchant_id", merchantId);

      if (costingError) {
        throw costingError;
      }

      const wasteByMenu = new Map(
        (costingRows ?? []).map((row) => [row.menu_item_id, row.waste_pct]),
      );

      return (recipes ?? []).map((row): RecipeCostRow => {
        const material = row.raw_materials_inventory as { unit_cost: number };
        return {
          menuItemId: row.menu_item_id,
          rawMaterialId: row.raw_material_id,
          quantityKg: Number(row.quantity_kg),
          unitCost: Number(material.unit_cost),
          wastePct: wasteByMenu.get(row.menu_item_id) ?? null,
        };
      });
    },

    async listTableSessions(merchantId, bounds) {
      const { data, error } = await supabase
        .from("table_sessions_log")
        .select("closed_at")
        .eq("merchant_id", merchantId)
        .gte("closed_at", bounds.startIso)
        .lt("closed_at", bounds.endIso);

      if (error) {
        throw error;
      }

      return (data ?? []).map((row): TableSessionRow => {
        const { dayOfWeek, hour } = sessionDayHour(row.closed_at);
        return { closedAt: row.closed_at, dayOfWeek, hour };
      });
    },

    async updateMerchantSettings(merchantId, input) {
      const { error } = await supabase
        .from("merchants")
        .update({
          monthly_fixed_overhead: input.monthlyFixedOverhead,
          seating_table_count: input.seatingTableCount,
        })
        .eq("id", merchantId);

      if (error) {
        throw error;
      }
    },
  };
}
