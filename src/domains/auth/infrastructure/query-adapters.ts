"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSessionProfile,
  signIn,
  signOut,
} from "@/domains/auth/application/use-cases";
import { createAuthRepository } from "@/domains/auth/infrastructure/supabase-auth-repo";
import { createStaffUserAction } from "@/domains/auth/infrastructure/staff-user-action";
import { createSessionProfileRepository } from "@/domains/auth/infrastructure/supabase-repo";
import type { CreateStaffUserInput, SignInCredentials } from "@/domains/auth/domain/entities";
import { createClient } from "@/shared/infrastructure/supabase/client";

export function sessionProfileQueryKey(userId: string) {
  return ["session-profile", userId] as const;
}

async function fetchClientSessionProfile(userId: string, email: string) {
  const supabase = createClient();
  const repository = createSessionProfileRepository(supabase);
  const profile = await getSessionProfile(userId, email, repository);
  return { ...profile, queryUserId: userId };
}

export function useSessionProfile(userId: string, email: string) {
  return useQuery({
    queryKey: sessionProfileQueryKey(userId),
    queryFn: () => fetchClientSessionProfile(userId, email),
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: SignInCredentials) => {
      const supabase = createClient();
      const authRepository = createAuthRepository(supabase);
      return signIn(credentials, authRepository);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: sessionProfileQueryKey(result.userId),
      });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const authRepository = createAuthRepository(supabase);
      await signOut(authRepository);
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useCreateStaffUser() {
  return useMutation({
    mutationFn: async (input: CreateStaffUserInput) => {
      const result = await createStaffUserAction(input);

      if (!result.success) {
        const error = new Error(result.message);
        Object.assign(error, {
          code: result.code,
          fieldErrors: result.fieldErrors,
        });
        throw error;
      }

      return result;
    },
  });
}

export function useBootstrapSessionProfile() {
  return useQuery({
    queryKey: ["session-profile", "bootstrap"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error("not_authenticated");
      }

      const email = user.email ?? "";
      return fetchClientSessionProfile(user.id, email);
    },
  });
}

export { fetchClientSessionProfile };
