import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type { MenuItem, MenuItemKind, ProteinGroup } from "../domain/entities";
import type { MenuCatalogRepository } from "../domain/repository";

type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];

type MenuItemListRow = Pick<
  MenuItemRow,
  | "id"
  | "merchant_id"
  | "name"
  | "price"
  | "item_kind"
  | "protein_group"
  | "weight_label"
  | "is_active"
>;

function mapMenuItemRow(row: MenuItemListRow): MenuItem {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    price: Number(row.price),
    itemKind: row.item_kind as MenuItemKind,
    proteinGroup: row.protein_group as ProteinGroup | null,
    weightLabel: row.weight_label,
    isActive: row.is_active,
  };
}

export function createMenuCatalogRepository(
  supabase: SupabaseClient<Database>,
): MenuCatalogRepository {
  return {
    async listActiveMenu(merchantId) {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id, merchant_id, name, price, item_kind, protein_group, weight_label, is_active",
        )
        .eq("merchant_id", merchantId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapMenuItemRow);
    },
  };
}
