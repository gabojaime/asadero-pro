import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type { ProteinGroup } from "@/domains/orders/domain/entities";
import { defaultWastePctForProteinGroup } from "@/domains/menu/domain/starter-catalog";
import {
  inferRecipeLinkForMeatPlate,
  type InventoryMaterialRef,
} from "../domain/protein-inventory-link";
import { WasteError } from "../domain/errors";
import type {
  CostingRepository,
  InventoryDeductionRepository,
} from "../domain/repository";
import type { MeatPlateCostingSourceRow } from "../domain/entities";
import {
  readWastePctFromEmbed,
  type MenuItemCostingEmbed,
} from "./menu-item-costing-embed";

type CostingListRow = {
  id: string;
  name: string;
  weight_label: string | null;
  protein_group: string | null;
  price: number;
  menu_item_costing: MenuItemCostingEmbed;
  recipe_ingredients: Array<{
    quantity_kg: number;
    raw_materials_inventory: {
      id: string;
      name: string;
      unit_cost: number;
    } | null;
  }> | null;
};

function mapCostingRow(row: CostingListRow): MeatPlateCostingSourceRow {
  const recipe = row.recipe_ingredients?.[0] ?? null;
  const rawMaterial = recipe?.raw_materials_inventory ?? null;

  return {
    menuItemId: row.id,
    name: row.name,
    weightLabel: row.weight_label,
    proteinGroup: row.protein_group as ProteinGroup | null,
    currentPrice: Number(row.price),
    rawMaterialId: rawMaterial?.id ?? null,
    rawMaterialName: rawMaterial?.name ?? null,
    unitCost: rawMaterial ? Number(rawMaterial.unit_cost) : null,
    recipeQuantityKg: recipe ? Number(recipe.quantity_kg) : null,
    wastePct: readWastePctFromEmbed(row.menu_item_costing),
  };
}

function mapPostgresError(error: { message: string }): never {
  if (error.message.includes("forbidden")) {
    throw new WasteError(
      "forbidden",
      "No tienes permiso para realizar esta acción.",
    );
  }

  if (error.message.includes("not_found")) {
    throw new WasteError("not_found", "Recurso no encontrado.");
  }

  throw error;
}

async function fetchProteinInventoryMaterials(
  supabase: SupabaseClient<Database>,
  merchantId: string,
): Promise<InventoryMaterialRef[]> {
  const { data, error } = await supabase
    .from("raw_materials_inventory")
    .select("id, name, unit_cost")
    .eq("merchant_id", merchantId)
    .eq("is_active", true)
    .eq("unit_of_measure", "kilogram");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    unitCost: Number(row.unit_cost),
  }));
}

export function createCostingRepository(
  supabase: SupabaseClient<Database>,
): CostingRepository {
  return {
    async listMeatPlateCosting(merchantId) {
      const [{ data: merchant, error: merchantError }, { data, error }] =
        await Promise.all([
          supabase
            .from("merchants")
            .select("target_food_cost_pct")
            .eq("id", merchantId)
            .single(),
          supabase
            .from("menu_items")
            .select(
              `
              id,
              name,
              weight_label,
              protein_group,
              price,
              menu_item_costing ( waste_pct ),
              recipe_ingredients (
                quantity_kg,
                raw_materials_inventory (
                  id,
                  name,
                  unit_cost
                )
              )
            `,
            )
            .eq("merchant_id", merchantId)
            .eq("is_active", true)
            .eq("item_kind", "meat_plate")
            .order("protein_group", { ascending: true })
            .order("weight_label", { ascending: true }),
        ]);

      if (merchantError) {
        throw merchantError;
      }

      if (error) {
        throw error;
      }

      return {
        targetFoodCostPct: Number(merchant.target_food_cost_pct),
        rows: (data ?? []).map((row) => mapCostingRow(row as CostingListRow)),
      };
    },

    async listProteinInventoryMaterials(merchantId) {
      return fetchProteinInventoryMaterials(supabase, merchantId);
    },

    async ensureInferredRecipeIngredient({
      merchantId,
      menuItemId,
      proteinGroup,
      weightLabel,
    }) {
      const { data: existing, error: existingError } = await supabase
        .from("recipe_ingredients")
        .select("id")
        .eq("menu_item_id", menuItemId)
        .maybeSingle();

      if (existingError) {
        mapPostgresError(existingError);
      }

      if (existing) {
        return false;
      }

      const materials = await fetchProteinInventoryMaterials(
        supabase,
        merchantId,
      );

      const inferred = inferRecipeLinkForMeatPlate({
        proteinGroup,
        weightLabel,
        materials,
      });

      if (!inferred) {
        return false;
      }

      const { error: insertError } = await supabase
        .from("recipe_ingredients")
        .insert({
          menu_item_id: menuItemId,
          raw_material_id: inferred.rawMaterialId,
          quantity_kg: inferred.recipeQuantityKg,
        });

      if (insertError) {
        mapPostgresError(insertError);
      }

      return true;
    },

    async ensureDefaultWastePctIfMissing({
      merchantId,
      menuItemId,
      proteinGroup,
    }) {
      const { data: existing, error: existingError } = await supabase
        .from("menu_item_costing")
        .select("menu_item_id")
        .eq("menu_item_id", menuItemId)
        .maybeSingle();

      if (existingError) {
        mapPostgresError(existingError);
      }

      if (existing) {
        return false;
      }

      const { error: insertError } = await supabase
        .from("menu_item_costing")
        .insert({
          merchant_id: merchantId,
          menu_item_id: menuItemId,
          waste_pct: defaultWastePctForProteinGroup(proteinGroup),
        });

      if (insertError) {
        mapPostgresError(insertError);
      }

      return true;
    },

    async upsertWastePct({ merchantId, menuItemId, wastePct }) {
      const { error } = await supabase.from("menu_item_costing").upsert(
        {
          merchant_id: merchantId,
          menu_item_id: menuItemId,
          waste_pct: wastePct,
        },
        { onConflict: "menu_item_id" },
      );

      if (error) {
        mapPostgresError(error);
      }
    },

    async updateTargetFoodCostPct({ merchantId, targetFoodCostPct }) {
      const { data, error } = await supabase
        .from("merchants")
        .update({ target_food_cost_pct: targetFoodCostPct })
        .eq("id", merchantId)
        .select("target_food_cost_pct")
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return Number(data.target_food_cost_pct);
    },
  };
}

type DeductionRpcResult = {
  success?: boolean;
  idempotent?: boolean;
  partial?: boolean;
  deductions?: Array<{
    raw_material_id: string;
    requested_kg: number;
    applied_kg: number;
  }>;
};

export function createInventoryDeductionRepository(
  supabase: SupabaseClient<Database>,
): InventoryDeductionRepository {
  return {
    async completeOrderAndDeduct({ orderId }) {
      const { data, error } = await supabase.rpc(
        "complete_order_and_deduct_inventory",
        { p_order_id: orderId },
      );

      if (error) {
        if (error.message.includes("order_not_completable")) {
          throw new WasteError(
            "validation_failed",
            "El pedido no se puede completar.",
          );
        }

        mapPostgresError(error);
      }

      const payload = (data ?? {}) as DeductionRpcResult;

      return {
        idempotent: Boolean(payload.idempotent),
        partialDeduction: Boolean(payload.partial),
        deductions: (payload.deductions ?? []).map((entry) => ({
          rawMaterialId: entry.raw_material_id,
          requestedKg: Number(entry.requested_kg),
          appliedKg: Number(entry.applied_kg),
        })),
      };
    },
  };
}
