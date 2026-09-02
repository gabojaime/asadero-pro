import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";
import { AuthError } from "../domain/errors";
import type { CreateStaffUserInput } from "../domain/entities";
import type { StaffUserRepository } from "../domain/repository";
import type { createAdminClient } from "@/shared/infrastructure/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export function createStaffUserRepository(
  adminClient: AdminClient,
  userClient: SupabaseClient<Database>,
): StaffUserRepository {
  return {
    async createStaffUser(input: CreateStaffUserInput) {
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
        });

      if (authError || !authData.user) {
        throw new AuthError(
          "profile_creation_failed",
          "No se pudo crear el usuario. Verifica el correo e intenta de nuevo.",
        );
      }

      const userId = authData.user.id;

      const { error: rpcError } = await userClient.rpc(
        "create_staff_user_profile",
        {
          p_user_id: userId,
          p_email: input.email,
          p_full_name: input.fullName,
          p_role: input.role,
        },
      );

      if (rpcError) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new AuthError(
          "profile_creation_failed",
          "No se pudo completar el registro del personal.",
        );
      }

      return {
        userId,
        email: input.email,
        role: input.role,
      };
    },
  };
}
