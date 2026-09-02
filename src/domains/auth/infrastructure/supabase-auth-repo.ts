import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthError } from "../domain/errors";
import type { SignInCredentials } from "../domain/entities";
import type { AuthRepository } from "../domain/repository";

function mapSignInError(): AuthError {
  return new AuthError(
    "invalid_credentials",
    "Correo o contraseña incorrectos.",
  );
}

export function createAuthRepository(
  supabase: SupabaseClient,
): AuthRepository {
  return {
    async signInWithPassword(credentials: SignInCredentials) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error || !data.user) {
        throw mapSignInError();
      }

      const email = data.user.email ?? credentials.email;

      return {
        userId: data.user.id,
        email,
      };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new AuthError("unknown", "No se pudo cerrar la sesión.");
      }
    },
  };
}
