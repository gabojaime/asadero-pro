"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuItemsQueryKey } from "@/domains/orders/infrastructure/query-adapters";
import { meatPlateCostingQueryKey } from "@/domains/waste/infrastructure/query-adapters";
import type {
  CreateMenuItemInput,
  ListMenuItemsFilters,
  UpdateMenuItemInput,
} from "@/domains/menu/domain/entities";
import {
  createMenuItemAction,
  deactivateMenuItemAction,
  listMenuItemsAction,
  reactivateMenuItemAction,
  seedStarterMenuCatalogAction,
  listProteinInsumoAvailabilityAction,
  updateMenuItemAction,
  type ActionFailure,
  type MenuItemDto,
  type SeedStarterMenuCatalogDto,
} from "@/domains/menu/infrastructure/menu-item-actions";
import type { ProteinInsumoAvailability } from "@/domains/waste/domain/protein-inventory-link";

export function menuCatalogQueryKey(
  merchantId: string,
  filters?: ListMenuItemsFilters,
) {
  return ["menu-catalog", merchantId, filters ?? {}] as const;
}

function invalidateMenuConsumers(
  queryClient: ReturnType<typeof useQueryClient>,
  merchantId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["menu-catalog", merchantId],
  });
  queryClient.invalidateQueries({
    queryKey: menuItemsQueryKey(merchantId),
  });
  queryClient.invalidateQueries({
    queryKey: meatPlateCostingQueryKey(merchantId),
  });
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

export function useMenuCatalog(
  merchantId: string | null,
  filters?: ListMenuItemsFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: menuCatalogQueryKey(merchantId ?? "unknown", filters),
    enabled: Boolean(merchantId) && (options?.enabled ?? true),
    queryFn: async () => {
      const result = await listMenuItemsAction(filters);
      return unwrapActionResult(result).items;
    },
  });
}

export function useCreateMenuItem(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMenuItemInput) => {
      const result = await createMenuItemAction(input);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateMenuConsumers(queryClient, merchantId);
      }
    },
  });
}

export function useUpdateMenuItem(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateMenuItemInput;
    }) => {
      const result = await updateMenuItemAction(id, input);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateMenuConsumers(queryClient, merchantId);
      }
    },
  });
}

export function useDeactivateMenuItem(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deactivateMenuItemAction(id);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateMenuConsumers(queryClient, merchantId);
      }
    },
  });
}

export function useReactivateMenuItem(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await reactivateMenuItemAction(id);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateMenuConsumers(queryClient, merchantId);
      }
    },
  });
}

export function proteinInsumoAvailabilityQueryKey(merchantId: string) {
  return ["protein-insumo-availability", merchantId] as const;
}

export function useProteinInsumoAvailability(
  merchantId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: proteinInsumoAvailabilityQueryKey(merchantId ?? "unknown"),
    enabled: Boolean(merchantId) && (options?.enabled ?? true),
    staleTime: 60_000,
    queryFn: async () => {
      const result = await listProteinInsumoAvailabilityAction();
      return unwrapActionResult(result).availability as ProteinInsumoAvailability;
    },
  });
}

export function useSeedStarterMenuCatalog(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await seedStarterMenuCatalogAction();
      return unwrapActionResult(result) as { success: true } & SeedStarterMenuCatalogDto;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateMenuConsumers(queryClient, merchantId);
        queryClient.invalidateQueries({
          queryKey: proteinInsumoAvailabilityQueryKey(merchantId),
        });
      }
    },
  });
}

export type { MenuItemDto, SeedStarterMenuCatalogDto };
