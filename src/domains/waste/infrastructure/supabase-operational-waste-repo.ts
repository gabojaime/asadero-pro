import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type {
  KgRawMaterialOption,
  OperationalWasteLog,
  WasteReason,
} from "../domain/operational-waste";
import type { OperationalWasteRepository } from "../domain/repository";
import { mapOperationalWasteRpcError } from "./map-operational-waste-rpc-error";

type WasteLogRow = Database["public"]["Tables"]["waste_logs"]["Row"];

type WasteLogListRow = WasteLogRow & {
  raw_materials_inventory: Pick<
    Database["public"]["Tables"]["raw_materials_inventory"]["Row"],
    "name"
  > | null;
  users: Pick<Database["public"]["Tables"]["users"]["Row"], "full_name"> | null;
};

function mapWasteLogRow(row: WasteLogListRow): OperationalWasteLog {
  return {
    id: row.id,
    rawMaterialId: row.raw_material_id ?? "",
    rawMaterialName: row.raw_materials_inventory?.name ?? "—",
    weightKg: Number(row.weight_kg),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
    reason: row.reason as WasteReason,
    loggedByUserId: row.logged_by,
    loggedByDisplayName: row.users?.full_name ?? null,
    createdAt: row.created_at,
  };
}

async function fetchWasteLogById(
  supabase: SupabaseClient<Database>,
  merchantId: string,
  wasteLogId: string,
): Promise<OperationalWasteLog> {
  const { data, error } = await supabase
    .from("waste_logs")
    .select(
      `
      *,
      raw_materials_inventory(name),
      users(full_name)
    `,
    )
    .eq("merchant_id", merchantId)
    .eq("id", wasteLogId)
    .maybeSingle();

  if (error || !data) {
    mapOperationalWasteRpcError(error ?? { message: "not_found" });
  }

  return mapWasteLogRow(data as WasteLogListRow);
}

export function createOperationalWasteRepository(
  supabase: SupabaseClient<Database>,
): OperationalWasteRepository {
  return {
    async logWaste({ merchantId, input }) {
      const { data, error } = await supabase.rpc("log_operational_waste", {
        p_raw_material_id: input.rawMaterialId,
        p_weight_kg: input.weightKg,
        p_reason: input.reason,
      });

      if (error) {
        mapOperationalWasteRpcError(error);
      }

      const payload = data as {
        success?: boolean;
        waste_log_id?: string;
        partial?: boolean;
      } | null;

      if (!payload?.success || !payload.waste_log_id) {
        throw new Error("Unexpected RPC response.");
      }

      const log = await fetchWasteLogById(
        supabase,
        merchantId,
        payload.waste_log_id,
      );

      return {
        log,
        partialStock: Boolean(payload.partial),
      };
    },

    async listLogsForLocalDay({
      merchantId,
      dayStartIso,
      dayEndIso,
      limit,
    }) {
      const { data, error } = await supabase
        .from("waste_logs")
        .select(
          `
          *,
          raw_materials_inventory(name),
          users(full_name)
        `,
        )
        .eq("merchant_id", merchantId)
        .gte("created_at", dayStartIso)
        .lt("created_at", dayEndIso)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        mapOperationalWasteRpcError(error);
      }

      return (data ?? []).map((row) => mapWasteLogRow(row as WasteLogListRow));
    },

    async listKgRawMaterials(merchantId) {
      const { data, error } = await supabase
        .from("raw_materials_inventory")
        .select("id, name, quantity_on_hand, unit_cost")
        .eq("merchant_id", merchantId)
        .eq("is_active", true)
        .eq("unit_of_measure", "kilogram")
        .order("name", { ascending: true });

      if (error) {
        mapOperationalWasteRpcError(error);
      }

      return (data ?? []).map(
        (row): KgRawMaterialOption => ({
          id: row.id,
          name: row.name,
          quantityOnHand: Number(row.quantity_on_hand),
          unitCost: Number(row.unit_cost),
        }),
      );
    },
  };
}
