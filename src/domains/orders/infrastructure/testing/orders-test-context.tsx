"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type {
  MenuCatalogRepository,
  OrderRepository,
} from "../../domain/repository";

export type OrdersTestContextValue = {
  profile: SessionProfile;
  catalogRepo: MenuCatalogRepository;
  orderRepo: OrderRepository;
  disableRealtime?: boolean;
};

const OrdersTestContext = createContext<OrdersTestContextValue | null>(null);

type OrdersTestProvidersProps = {
  value: OrdersTestContextValue;
  children: ReactNode;
};

export function OrdersTestProviders({
  value,
  children,
}: OrdersTestProvidersProps) {
  return (
    <OrdersTestContext.Provider value={value}>
      {children}
    </OrdersTestContext.Provider>
  );
}

export function useOrdersTestContext(): OrdersTestContextValue | null {
  return useContext(OrdersTestContext);
}
