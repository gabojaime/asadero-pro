import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import { mapMenuItemRow } from "@/domains/menu/infrastructure/menu-item-row-mapper";
import type { MenuItem } from "../domain/entities";
import type { MenuCatalogRepository } from "../domain/repository";

function mapActiveCatalogItem(
  row: Parameters<typeof mapMenuItemRow>[0],
): MenuItem {
  const mapped = mapMenuItemRow(row);
  return {
    id: mapped.id,
    merchantId: mapped.merchantId,
    name: mapped.name,
    price: mapped.price,
    itemKind: mapped.itemKind,
    proteinGroup: mapped.proteinGroup,
    weightLabel: mapped.weightLabel,
    isActive: mapped.isActive,
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

      return (data ?? []).map(mapActiveCatalogItem);
    },
  };
}
