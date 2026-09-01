"use client";

import { useQuery } from "@tanstack/react-query";
import { getSessionProfile } from "@/domains/auth/application/use-cases";
import { createSessionProfileRepository } from "@/domains/auth/infrastructure/supabase-repo";
import { createClient } from "@/shared/infrastructure/supabase/client";

export function useSessionProfile() {
  return useQuery({
    queryKey: ["session-profile"],
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
      const repository = createSessionProfileRepository(supabase);
      const profile = await getSessionProfile(user.id, email, repository);

      return { ...profile, queryUserId: user.id };
    },
  });
}

export function sessionProfileQueryKey(userId: string) {
  return ["session-profile", userId] as const;
}
