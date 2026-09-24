import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import {
  TestSessionProvider,
  type SessionContextValue,
} from "@/domains/auth/presentation/providers/session-context";
import { createInMemoryOrderRepos } from "../../infrastructure/testing/in-memory-order-repos";
import { createInMemoryMerchantKitchenSettingsRepo } from "../../infrastructure/testing/in-memory-merchant-kitchen-settings-repo";
import { OrdersTestProviders } from "../../infrastructure/testing/orders-test-context";

type RenderOrdersOptions = {
  profile: SessionProfile;
  repos?: ReturnType<typeof createInMemoryOrderRepos>;
  merchantSettingsRepo?: ReturnType<
    typeof createInMemoryMerchantKitchenSettingsRepo
  >;
  queryClient?: QueryClient;
};

function profileToSessionValue(profile: SessionProfile): SessionContextValue {
  if (!profile.merchantId || !profile.role) {
    throw new Error("Test profile requires merchantId and role");
  }

  return {
    userId: profile.userId,
    email: profile.email,
    merchantId: profile.merchantId,
    merchantName: profile.merchantName,
    fullName: profile.fullName,
    role: profile.role,
    isLoading: false,
    isError: false,
  };
}

export function createOrdersTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithOrderProviders(
  ui: ReactElement,
  options: RenderOrdersOptions,
  renderOptions?: Omit<RenderOptions, "wrapper">,
) {
  const repos = options.repos ?? createInMemoryOrderRepos();
  const merchantSettingsRepo =
    options.merchantSettingsRepo ?? createInMemoryMerchantKitchenSettingsRepo();
  const queryClient = options.queryClient ?? createOrdersTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestSessionProvider value={profileToSessionValue(options.profile)}>
          <OrdersTestProviders
            value={{
              profile: options.profile,
              catalogRepo: repos.catalogRepo,
              orderRepo: repos.orderRepo,
              merchantSettingsRepo,
              disableRealtime: true,
            }}
          >
            {children}
          </OrdersTestProviders>
        </TestSessionProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    repos,
  };
}
