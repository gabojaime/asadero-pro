import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type {
  InventoryMovement,
  RawMaterial,
  UnitOfMeasure,
} from "../domain/entities";
import { RawMaterialError } from "../domain/errors";
import type {
  CreateRawMaterialPayload,
  RawMaterialRepository,
} from "../domain/repository";
import type { UpdateRawMaterialInput } from "../domain/entities";

type InventoryRow = Database["public"]["Tables"]["raw_materials_inventory"]["Row"];
type MovementRow = Database["public"]["Tables"]["inventory_movements"]["Row"];

function mapInventoryRow(row: InventoryRow): RawMaterial {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    sku: row.sku,
    unitOfMeasure: row.unit_of_measure as UnitOfMeasure,
    quantityOnHand: Number(row.quantity_on_hand),
    unitCost: Number(row.unit_cost),
    isActive: row.is_active,
    updatedAt: new Date(row.last_updated),
  };
}

function mapMovementRow(row: MovementRow): InventoryMovement {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    rawMaterialId: row.raw_material_id,
    movementType: "receipt",
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    recordedBy: row.recorded_by,
    createdAt: new Date(row.created_at),
  };
}

function mapPostgresError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new RawMaterialError(
      "conflict",
      "Ya existe un insumo activo con ese nombre.",
    );
  }

  if (error.message.includes("not_found")) {
    throw new RawMaterialError("not_found", "Insumo no encontrado.");
  }

  if (error.message.includes("forbidden")) {
    throw new RawMaterialError(
      "forbidden",
      "No tienes permiso para realizar esta acción.",
    );
  }

  throw error;
}

export function createRawMaterialRepository(
  supabase: SupabaseClient<Database>,
): RawMaterialRepository {
  return {
    async listByMerchant(merchantId, filters) {
      let query = supabase
        .from("raw_materials_inventory")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("name", { ascending: true });

      if (filters?.activeOnly !== false) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapInventoryRow);
    },

    async getById(id) {
      const { data, error } = await supabase
        .from("raw_materials_inventory")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapInventoryRow(data) : null;
    },

    async create(input: CreateRawMaterialPayload) {
      const { data, error } = await supabase
        .from("raw_materials_inventory")
        .insert({
          merchant_id: input.merchantId,
          name: input.name,
          sku: input.sku ?? null,
          unit_of_measure: input.unitOfMeasure,
          quantity_on_hand: 0,
          unit_cost: 0,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return mapInventoryRow(data);
    },

    async createMany(inputs) {
      if (inputs.length === 0) {
        return [];
      }

      const rows = inputs.map((input) => ({
        merchant_id: input.merchantId,
        name: input.name,
        sku: input.sku ?? null,
        unit_of_measure: input.unitOfMeasure,
        quantity_on_hand: 0,
        unit_cost: 0,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from("raw_materials_inventory")
        .insert(rows)
        .select("*");

      if (error) {
        mapPostgresError(error);
      }

      return (data ?? []).map(mapInventoryRow);
    },

    async update(id, input: UpdateRawMaterialInput) {
      const { data, error } = await supabase
        .from("raw_materials_inventory")
        .update({
          name: input.name,
          sku: input.sku ?? null,
          last_updated: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return mapInventoryRow(data);
    },

    async deactivate(id) {
      const { data, error } = await supabase
        .from("raw_materials_inventory")
        .update({
          is_active: false,
          last_updated: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        mapPostgresError(error);
      }

      return mapInventoryRow(data);
    },

    async applyReceipt(params) {
      const { error } = await supabase.rpc("apply_inventory_receipt", {
        p_raw_material_id: params.rawMaterialId,
        p_quantity_on_hand: params.quantityOnHand,
        p_unit_cost: params.unitCost,
        p_movement_quantity: params.movementQuantity,
        p_movement_unit_cost: params.movementUnitCost,
      });

      if (error) {
        mapPostgresError(error);
      }

      const updated = await this.getById(params.rawMaterialId);
      if (!updated) {
        throw new RawMaterialError("not_found", "Insumo no encontrado.");
      }

      return updated;
    },

    async listMovements(rawMaterialId, limit = 10) {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("raw_material_id", rawMaterialId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapMovementRow);
    },
  };
}
