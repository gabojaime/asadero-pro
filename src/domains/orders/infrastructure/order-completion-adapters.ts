"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type {
  ActionFailure,
  OrderDto,
} from "@/domains/orders/infrastructure/order-dtos";
import { useOrdersTestContext } from "@/domains/orders/infrastructure/testing/orders-test-context";
import {
  activeOrdersQueryKey,
  ORDERS_POLLING_FALLBACK_MS,
  servedOrdersQueryKey,
} from "./query-adapters";

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
  lines: OrderDto["lines"];
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

type ServedOrdersQueryOptions = {
  realtimeSubscribed?: boolean;
  realtimeDisabled?: boolean;
};

export function useServedOrders(
  merchantId: string | null,
  options?: ServedOrdersQueryOptions,
) {
  const testContext = useOrdersTestContext();
  const usePollingFallback =
    !testContext?.disableRealtime &&
    !options?.realtimeDisabled &&
    options?.realtimeSubscribed === false;

  return useQuery({
    queryKey: servedOrdersQueryKey(merchantId ?? "unknown"),
    enabled: Boolean(merchantId),
    staleTime: 0,
    refetchInterval: usePollingFallback ? ORDERS_POLLING_FALLBACK_MS : false,
    queryFn: async () => {
      if (testContext && merchantId) {
        const { listServedOrders } = await import(
          "@/domains/orders/application/use-cases"
        );
        const orders = await listServedOrders(
          merchantId,
          testContext.orderRepo,
        );
        return orders.map(serializeOrderForClient);
      }

      const { listServedOrdersAction } = await import(
        "@/domains/orders/infrastructure/order-actions"
      );
      const result = await listServedOrdersAction();
      return unwrapActionResult(result).orders as OrderDto[];
    },
  });
}

export function useCompleteOrder(profile: SessionProfile | null) {
  const queryClient = useQueryClient();
  const testContext = useOrdersTestContext();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (testContext && profile) {
        const { completeOrder } = await import(
          "@/domains/orders/application/use-cases"
        );
        const deductionRepo = testContext.deductionRepo;
        if (!deductionRepo) {
          throw new Error("Deduction repository is not configured for tests.");
        }

        const result = await completeOrder(
          orderId,
          profile,
          testContext.orderRepo,
          deductionRepo,
        );

        return {
          order: serializeOrderForClient(result.order),
          idempotent: result.idempotent,
          partialDeduction: result.partialDeduction,
        };
      }

      const { completeOrderAction } = await import(
        "@/domains/orders/infrastructure/order-actions"
      );
      const result = await completeOrderAction({ orderId });
      const payload = unwrapActionResult(result);
      return {
        order: payload.order as OrderDto,
        idempotent: payload.idempotent,
        partialDeduction: payload.partialDeduction,
      };
    },
    onSuccess: () => {
      const merchantId = profile?.merchantId ?? testContext?.profile.merchantId;
      if (merchantId) {
        queryClient.invalidateQueries({
          queryKey: servedOrdersQueryKey(merchantId),
        });
        queryClient.invalidateQueries({
          queryKey: activeOrdersQueryKey(merchantId),
        });
        queryClient.invalidateQueries({
          queryKey: ["raw-materials", merchantId],
        });
      }
    },
  });
}
