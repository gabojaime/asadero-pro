import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  activeOrdersQueryKey,
  servedOrdersQueryKey,
  useKitchenOrdersRealtime,
} from "./query-adapters";

const subscribeActiveOrdersMock = vi.fn();

vi.mock("@/domains/orders/infrastructure/kitchen-realtime", () => ({
  subscribeActiveOrders: (...args: unknown[]) => subscribeActiveOrdersMock(...args),
}));

vi.mock("@/shared/infrastructure/supabase/client", () => ({
  createClient: vi.fn(() => ({})),
}));

describe("useKitchenOrdersRealtime", () => {
  it("invalidates active and served order queries on postgres change", async () => {
    subscribeActiveOrdersMock.mockImplementation(
      (_supabase: unknown, _merchantId: string, callbacks: { onChange: () => void }) => {
        callbacks.onChange();
        return vi.fn();
      },
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const merchantId = "merchant-realtime-test";

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
    }

    renderHook(() => useKitchenOrdersRealtime(merchantId), { wrapper: Wrapper });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: activeOrdersQueryKey(merchantId),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: servedOrdersQueryKey(merchantId),
      });
    });
  });
});
