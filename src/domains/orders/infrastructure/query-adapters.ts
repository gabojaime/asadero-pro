"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import {
  listActiveOrders,
  listMenuItems,
  markOrderReady,
  submitOrder,
} from "@/domains/orders/application/use-cases";
import type { Cart } from "@/domains/orders/domain/entities";
import type {
  ActionFailure,
  MenuItemDto,
  OrderDto,
} from "@/domains/orders/infrastructure/order-dtos";
import {
  subscribeActiveOrders,
  type KitchenRealtimeStatus,
} from "@/domains/orders/infrastructure/kitchen-realtime";
import { useOrdersTestContext } from "@/domains/orders/infrastructure/testing/orders-test-context";
import { createClient } from "@/shared/infrastructure/supabase/client";

export function menuItemsQueryKey(merchantId: string) {
  return ["menu-items", merchantId] as const;
}

export function activeOrdersQueryKey(merchantId: string) {
  return ["active-orders", merchantId] as const;
}

export function servedOrdersQueryKey(merchantId: string) {
  return ["served-orders", merchantId] as const;
}

function throwActionError(result: ActionFailure): never {
  const error = new Error(result.message);
  Object.assign(error, {
    code: result.code,
    fieldErrors: result.fieldErrors,
  });
  throw error;
}

function unwrapActionResult<T extends { success: true }>(
  result: T | ActionFailure,
): T {
  if (result.success === false) {
    throwActionError(result);
  }

  return result;
}

export function useMenuItems(merchantId: string | null) {
  const testContext = useOrdersTestContext();

  return useQuery({
    queryKey: menuItemsQueryKey(merchantId ?? "unknown"),
    enabled: Boolean(merchantId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (testContext && merchantId) {
        return listMenuItems(merchantId, testContext.catalogRepo);
      }

      const { listMenuItemsAction } = await import(
        "@/domains/orders/infrastructure/order-actions"
      );
      const result = await listMenuItemsAction();
      return unwrapActionResult(result).items as MenuItemDto[];
    },
  });
}

export const ORDERS_POLLING_FALLBACK_MS = 5000;

type ActiveOrdersQueryOptions = {
  realtimeSubscribed?: boolean;
  realtimeDisabled?: boolean;
};

export function useActiveOrders(
  merchantId: string | null,
  options?: ActiveOrdersQueryOptions,
) {
  const testContext = useOrdersTestContext();
  const usePollingFallback =
    !testContext?.disableRealtime &&
    !options?.realtimeDisabled &&
    options?.realtimeSubscribed === false;

  return useQuery({
    queryKey: activeOrdersQueryKey(merchantId ?? "unknown"),
    enabled: Boolean(merchantId),
    staleTime: 0,
    refetchInterval: usePollingFallback ? ORDERS_POLLING_FALLBACK_MS : false,
    queryFn: async () => {
      if (testContext && merchantId) {
        const orders = await listActiveOrders(
          merchantId,
          testContext.orderRepo,
        );
        return orders.map(serializeOrderForClient);
      }

      const { listActiveOrdersAction } = await import(
        "@/domains/orders/infrastructure/order-actions"
      );
      const result = await listActiveOrdersAction();
      return unwrapActionResult(result).orders as OrderDto[];
    },
  });
}

export function useSubmitOrder(profile: SessionProfile | null) {
  const queryClient = useQueryClient();
  const testContext = useOrdersTestContext();

  return useMutation({
    mutationFn: async (cart: Cart) => {
      if (testContext && profile) {
        const order = await submitOrder(
          cart,
          profile,
          testContext.catalogRepo,
          testContext.orderRepo,
        );
        return serializeOrderForClient(order);
      }

      const { submitOrderAction } = await import(
        "@/domains/orders/infrastructure/order-actions"
      );
      const result = await submitOrderAction(cart);
      return unwrapActionResult(result).order as OrderDto;
    },
    onSuccess: () => {
      const merchantId = profile?.merchantId ?? testContext?.profile.merchantId;
      if (merchantId) {
        queryClient.invalidateQueries({
          queryKey: activeOrdersQueryKey(merchantId),
        });
      }
    },
  });
}

export function useMarkOrderReady(profile: SessionProfile | null) {
  const queryClient = useQueryClient();
  const testContext = useOrdersTestContext();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (testContext && profile) {
        const order = await markOrderReady(
          orderId,
          profile,
          testContext.orderRepo,
        );
        return serializeOrderForClient(order);
      }

      const { markOrderReadyAction } = await import(
        "@/domains/orders/infrastructure/order-actions"
      );
      const result = await markOrderReadyAction({ orderId });
      return unwrapActionResult(result).order as OrderDto;
    },
    onSuccess: () => {
      const merchantId = profile?.merchantId ?? testContext?.profile.merchantId;
      if (merchantId) {
        queryClient.invalidateQueries({
          queryKey: activeOrdersQueryKey(merchantId),
        });
        queryClient.invalidateQueries({
          queryKey: servedOrdersQueryKey(merchantId),
        });
      }
    },
  });
}

export function useKitchenOrdersRealtime(merchantId: string | null) {
  const queryClient = useQueryClient();
  const testContext = useOrdersTestContext();
  const isRealtimeDisabled = Boolean(testContext?.disableRealtime);
  const [realtimeStatus, setRealtimeStatus] =
    useState<KitchenRealtimeStatus>("disconnected");

  useEffect(() => {
    if (!merchantId || isRealtimeDisabled) {
      setRealtimeStatus("disconnected");
      return;
    }

    const supabase = createClient();

    const invalidateOrderLists = () => {
      queryClient.invalidateQueries({
        queryKey: activeOrdersQueryKey(merchantId),
      });
      queryClient.invalidateQueries({
        queryKey: servedOrdersQueryKey(merchantId),
      });
    };

    const unsubscribe = subscribeActiveOrders(supabase, merchantId, {
      onChange: invalidateOrderLists,
      onStatusChange: setRealtimeStatus,
    });

    return unsubscribe;
  }, [merchantId, queryClient, isRealtimeDisabled]);

  const isSubscribed = realtimeStatus === "subscribed";

  return {
    realtimeStatus,
    isSubscribed,
    isReconnecting: !isRealtimeDisabled && !isSubscribed,
    isRealtimeDisabled,
  };
}

function serializeOrderForClient(order: {
  id: string;
  merchantId: string;
  serverId: string | null;
  serverName: string | null;
  tableNumber: number | null;
  serviceType: string;
  deliveryFee: number;
  deliveryZone: string | null;
  status: string;
  totalAmount: number;
  sentToKitchenAt: Date | string;
  readyAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines: Array<{
    id: string;
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    sides: Array<{
      slot: 1 | 2;
      sideMenuItemId: string;
      sideName: string;
    }>;
  }>;
}): OrderDto {
  return {
    ...order,
    sentToKitchenAt:
      typeof order.sentToKitchenAt === "string"
        ? order.sentToKitchenAt
        : order.sentToKitchenAt.toISOString(),
    readyAt: order.readyAt
      ? typeof order.readyAt === "string"
        ? order.readyAt
        : order.readyAt.toISOString()
      : null,
    createdAt:
      typeof order.createdAt === "string"
        ? order.createdAt
        : order.createdAt.toISOString(),
    updatedAt:
      typeof order.updatedAt === "string"
        ? order.updatedAt
        : order.updatedAt.toISOString(),
  };
}

export type { MenuItemDto, OrderDto };
