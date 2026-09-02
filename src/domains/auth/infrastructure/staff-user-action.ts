"use server";

import { createStaffUser } from "@/domains/auth/application/use-cases";
import type { CreateStaffUserInput } from "@/domains/auth/domain/entities";
import { AuthError } from "@/domains/auth/domain/errors";
import { createStaffUserRepository } from "@/domains/auth/infrastructure/supabase-staff-repo";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createAdminClient } from "@/shared/infrastructure/supabase/admin";
import { createClient } from "@/shared/infrastructure/supabase/server";

export type CreateStaffUserActionResult =
  | { success: true; userId: string; email: string; role: string }
  | { success: false; code: string; message: string; fieldErrors?: Record<string, string> };

export async function createStaffUserAction(
  input: CreateStaffUserInput,
): Promise<CreateStaffUserActionResult> {
  const profile = await getServerSessionProfile();

  if (!profile) {
    return {
      success: false,
      code: "not_authenticated",
      message: "Debes iniciar sesión para continuar.",
    };
  }

  try {
    const adminClient = createAdminClient();
    const userClient = await createClient();
    const repository = createStaffUserRepository(adminClient, userClient);
    const result = await createStaffUser(input, profile, repository);

    return {
      success: true,
      userId: result.userId,
      email: result.email,
      role: result.role,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    return {
      success: false,
      code: "unknown",
      message: "No se pudo crear el usuario. Intenta de nuevo.",
    };
  }
}
