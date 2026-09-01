import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import type { SessionProfile, UserRole } from "../domain/entities";
import type { SessionProfileRepository } from "../domain/repository";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type UserProfileRow = Pick<
  UserRow,
  "id" | "merchant_id" | "email" | "full_name" | "role"
>;

function mapUserRow(row: UserProfileRow, email: string): SessionProfile {
  return {
    userId: row.id,
    email,
    merchantId: row.merchant_id,
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
        .select("id, merchant_id, email, full_name, role")
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
