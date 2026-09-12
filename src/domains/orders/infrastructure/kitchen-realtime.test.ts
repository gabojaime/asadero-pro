import { describe, expect, it, vi } from "vitest";
import { subscribeActiveOrders } from "./kitchen-realtime";

function createSupabaseMock(subscribeStatus: string) {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback?: (status: string) => void) => {
      callback?.(subscribeStatus);
      return channel;
    }),
  };

  return {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    _channel: channel,
  };
}

describe("subscribeActiveOrders", () => {
  it("reports subscribed only after SUBSCRIBED channel event", () => {
    const supabase = createSupabaseMock("SUBSCRIBED");
    const statuses: string[] = [];

    subscribeActiveOrders(supabase as never, "merchant-1", {
      onChange: vi.fn(),
      onStatusChange: (status) => statuses.push(status),
    });

    expect(statuses).toEqual(["connecting", "subscribed"]);
  });

  it("reports disconnected on channel errors", () => {
    const supabase = createSupabaseMock("CHANNEL_ERROR");
    const statuses: string[] = [];

    const unsubscribe = subscribeActiveOrders(supabase as never, "merchant-1", {
      onChange: vi.fn(),
      onStatusChange: (status) => statuses.push(status),
    });

    expect(statuses).toContain("connecting");
    expect(statuses).toContain("disconnected");

    unsubscribe();
    expect(statuses.at(-1)).toBe("disconnected");
  });
});
