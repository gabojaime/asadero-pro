import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type { SessionProfile, UserRole } from "../domain/entities";
import type { SessionProfileRepository } from "../domain/repository";

type UserProfileRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "merchant_id" | "email" | "full_name" | "role"
> & {
  merchants: Pick<
    Database["public"]["Tables"]["merchants"]["Row"],
    "name"
  > | null;
};

function mapUserRow(row: UserProfileRow, email: string): SessionProfile {
  return {
    userId: row.id,
    email,
    merchantId: row.merchant_id,
    merchantName: row.merchants?.name ?? null,
    fullName: row.full_name,
    role: row.role as UserRole,
    isOnboarded: true,
  };
}

function createNotOnboardedProfile(
  userId: string,
  email: string,
): SessionProfile {
  return {
    userId,
    email,
    merchantId: null,
    merchantName: null,
    fullName: null,
    role: null,
    isOnboarded: false,
  };
}

export function createSessionProfileRepository(
  supabase: SupabaseClient<Database>,
): SessionProfileRepository {
  return {
    async getByUserId(userId, email) {
      const { data, error } = await supabase
        .from("users")
        .select("id, merchant_id, email, full_name, role, merchants(name)")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return createNotOnboardedProfile(userId, email);
      }

      return mapUserRow(data, email);
    },
  };
}
