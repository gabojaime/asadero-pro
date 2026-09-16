import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type { MenuItem, MenuItemKind, ProteinGroup } from "../domain/entities";

export type MenuItemRow = Pick<
  Database["public"]["Tables"]["menu_items"]["Row"],
  | "id"
  | "merchant_id"
  | "name"
  | "price"
  | "item_kind"
  | "protein_group"
  | "weight_label"
  | "is_active"
  | "created_at"
>;

export type MenuItemListRow = Omit<MenuItemRow, "created_at"> & {
  created_at?: string;
};

export function mapMenuItemRow(row: MenuItemListRow): MenuItem {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    price: Number(row.price),
    itemKind: row.item_kind as MenuItemKind,
    proteinGroup: row.protein_group as ProteinGroup | null,
    weightLabel: row.weight_label,
    isActive: row.is_active,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(0),
  };
}
