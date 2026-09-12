"use client";

import { useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-context";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import {
  useActiveOrders,
  useKitchenOrdersRealtime,
  useMarkOrderReady,
} from "../infrastructure/query-adapters";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { ORDER_COPY } from "./copy";
import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { useOrdersTestContext } from "../infrastructure/testing/orders-test-context";

function toSessionProfile(
  session: ReturnType<typeof useSession>,
): SessionProfile {
  return {
    userId: session.userId,
    email: session.email,
    merchantId: session.merchantId,
    merchantName: session.merchantName,
    fullName: session.fullName,
    role: session.role,
    isOnboarded: true,
  };
}

export function KitchenQueueView() {
  const session = useSession();
  const testContext = useOrdersTestContext();
  const profile = testContext?.profile ?? toSessionProfile(session);
  const merchantId = profile.merchantId;

  const [markError, setMarkError] = useState<string | null>(null);

  const { isSubscribed, isReconnecting, isRealtimeDisabled } =
    useKitchenOrdersRealtime(merchantId);
  const ordersQuery = useActiveOrders(merchantId, {
    realtimeSubscribed: isSubscribed,
    realtimeDisabled: isRealtimeDisabled,
  });
  const markReadyMutation = useMarkOrderReady(profile);

  const canMarkReady =
    profile.role === "grill_master" || profile.role === "admin";

  const handleMarkReady = async (orderId: string) => {
    setMarkError(null);

    try {
      await markReadyMutation.mutateAsync(orderId);
    } catch (error) {
      setMarkError(
        error instanceof Error ? error.message : ORDER_COPY.markReadyError,
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-8 tracking-tight">
          {ORDER_COPY.kitchenTitle}
        </h1>
        {isReconnecting ? (
          <p className="mt-2 text-[13px] text-primary">
            {ORDER_COPY.reconnecting}
          </p>
        ) : null}
        {markError ? (
          <p className="mt-2 text-[13px] text-primary">{markError}</p>
        ) : null}
      </div>

      {ordersQuery.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : ordersQuery.isError ? (
        <p className="text-[13px] text-primary">
          No se pudo cargar la cola de cocina.
        </p>
      ) : (ordersQuery.data?.length ?? 0) === 0 ? (
        <p className="text-[15px] text-muted-foreground">
          {ORDER_COPY.emptyKitchen}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ordersQuery.data?.map((order, index) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              index={index}
              canMarkReady={canMarkReady}
              isMarking={markReadyMutation.isPending}
              onMarkReady={(orderId) => void handleMarkReady(orderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
