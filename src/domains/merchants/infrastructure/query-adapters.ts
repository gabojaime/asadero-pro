"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeMerchantOnboarding } from "@/domains/merchants/application/use-cases";
import { createMerchantOnboardingRepository } from "@/domains/merchants/infrastructure/supabase-repo";
import { sessionProfileQueryKey } from "@/domains/auth/infrastructure/query-adapters";
import { createClient } from "@/shared/infrastructure/supabase/client";
import type { OnboardingInput } from "@/domains/merchants/domain/entities";

export function useCompleteOnboarding(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      const supabase = createClient();
      const repository = createMerchantOnboardingRepository(supabase);
      return completeMerchantOnboarding(input, repository);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: sessionProfileQueryKey(userId),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["session-profile"] });
    },
  });
}
