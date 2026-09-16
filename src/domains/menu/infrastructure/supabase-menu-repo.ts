import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import { MenuItemError } from "../domain/errors";
import type {
  CreateMenuItemPayload,
  MenuItemRepository,
} from "../domain/repository";
import type { UpdateMenuItemInput } from "../domain/entities";
import { mapMenuItemRow } from "./menu-item-row-mapper";

function mapPostgresError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new MenuItemError(
      "duplicate_name",
      "Ya existe un ítem activo con ese nombre.",
    );
  }

  if (error.message.includes("not_found")) {
    throw new MenuItemError("not_found", "Ítem de menú no encontrado.");
  }

  if (error.message.includes("forbidden")) {
    throw new MenuItemError(
      "forbidden",
      "No tienes permiso para realizar esta acción.",
    );
  }

  throw error;
}

export function createMenuItemRepository(
  supabase: SupabaseClient<Database>,
): MenuItemRepository {
  return {
    async listByMerchant(merchantId, filters) {
      let query = supabase
        .from("menu_items")
        .select(
          "id, merchant_id, name, price, item_kind, protein_group, weight_label, is_active, created_at",
        )
        .eq("merchant_id", merchantId)
        .order("item_kind", { ascending: true })
        .order("name", { ascending: true });

      if (filters?.activeOnly === true) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapMenuItemRow);
    },

    async getById(id) {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id, merchant_id, name, price, item_kind, protein_group, weight_label, is_active, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapMenuItemRow(data) : null;
    },

    async create(input: CreateMenuItemPayload) {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          merchant_id: input.merchantId,
          name: input.name,
          price: input.price,
          item_kind: input.itemKind,
          protein_group: input.proteinGroup,
          weight_label: input.weightLabel,
          is_active: true,
        })
        .select(
          "id, merchant_id, name, price, item_kind, protein_group, weight_label, is_active, created_at",
        )
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return mapMenuItemRow(data);
    },

    async update(id, input: UpdateMenuItemInput) {
      const { data, error } = await supabase
        .from("menu_items")
        .update({
          name: input.name,
          price: input.price,
          protein_group: input.proteinGroup,
          weight_label: input.weightLabel,
        })
        .eq("id", id)
        .select(
          "id, merchant_id, name, price, item_kind, protein_group, weight_label, is_active, created_at",
        )
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return mapMenuItemRow(data);
    },

    async setActive(id, isActive) {
      const { data, error } = await supabase
        .from("menu_items")
        .update({ is_active: isActive })
        .eq("id", id)
        .select(
          "id, merchant_id, name, price, item_kind, protein_group, weight_label, is_active, created_at",
        )
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return mapMenuItemRow(data);
    },
  };
}
