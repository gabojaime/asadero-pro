import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/database/supabase.types";

export type KitchenRealtimeStatus = "connecting" | "subscribed" | "disconnected";

type SubscribeActiveOrdersCallbacks = {
  onChange: () => void;
  onStatusChange: (status: KitchenRealtimeStatus) => void;
};

export function subscribeActiveOrders(
  supabase: SupabaseClient<Database>,
  merchantId: string,
  callbacks: SubscribeActiveOrdersCallbacks,
): () => void {
  callbacks.onStatusChange("connecting");

  const channel = supabase
    .channel(`kitchen-orders:${merchantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `merchant_id=eq.${merchantId}`,
      },
      () => callbacks.onChange(),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        callbacks.onStatusChange("subscribed");
        return;
      }

      if (
        status === "CLOSED" ||
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      ) {
        callbacks.onStatusChange("disconnected");
      }
    });

  return () => {
    void supabase.removeChannel(channel);
    callbacks.onStatusChange("disconnected");
  };
}
