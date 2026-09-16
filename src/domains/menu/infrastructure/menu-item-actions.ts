"use server";

import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import {
  createMenuItem,
  deactivateMenuItem,
  listMenuItems,
  reactivateMenuItem,
  updateMenuItem,
} from "@/domains/menu/application/use-cases";
import type {
  CreateMenuItemInput,
  ListMenuItemsFilters,
  UpdateMenuItemInput,
} from "@/domains/menu/domain/entities";
import { MenuItemError } from "@/domains/menu/domain/errors";
import { createMenuItemRepository } from "@/domains/menu/infrastructure/supabase-menu-repo";
import { createClient } from "@/shared/infrastructure/supabase/server";

type ActionFailure = {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

type MenuItemDto = {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  isActive: boolean;
  createdAt: string;
};

function serializeMenuItem(item: {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  isActive: boolean;
  createdAt: Date;
}): MenuItemDto {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
  };
}

function mapError(error: unknown): ActionFailure {
  if (error instanceof MenuItemError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  return {
    success: false,
    code: "unknown",
    message: "No se pudo completar la operación. Intenta de nuevo.",
  };
}

async function withRepository<T>(
  handler: (
    profile: NonNullable<Awaited<ReturnType<typeof getServerSessionProfile>>>,
    repository: ReturnType<typeof createMenuItemRepository>,
  ) => Promise<T>,
): Promise<T | ActionFailure> {
  const profile = await getServerSessionProfile();

  if (!profile) {
    return {
      success: false,
      code: "not_authenticated",
      message: "Debes iniciar sesión para continuar.",
    };
  }

  try {
    const supabase = await createClient();
    const repository = createMenuItemRepository(supabase);
    return await handler(profile, repository);
  } catch (error) {
    return mapError(error);
  }
}

export async function listMenuItemsAction(filters?: ListMenuItemsFilters) {
  return withRepository(async (profile, repository) => {
    const items = await listMenuItems(profile, filters, repository);
    return {
      success: true as const,
      items: items.map(serializeMenuItem),
    };
  });
}

export async function createMenuItemAction(input: CreateMenuItemInput) {
  return withRepository(async (profile, repository) => {
    const created = await createMenuItem(input, profile, repository);
    return {
      success: true as const,
      item: serializeMenuItem(created),
    };
  });
}

export async function updateMenuItemAction(
  id: string,
  input: UpdateMenuItemInput,
) {
  return withRepository(async (profile, repository) => {
    const updated = await updateMenuItem(id, input, profile, repository);
    return {
      success: true as const,
      item: serializeMenuItem(updated),
    };
  });
}

export async function deactivateMenuItemAction(id: string) {
  return withRepository(async (profile, repository) => {
    const deactivated = await deactivateMenuItem(id, profile, repository);
    return {
      success: true as const,
      item: serializeMenuItem(deactivated),
    };
  });
}

export async function reactivateMenuItemAction(id: string) {
  return withRepository(async (profile, repository) => {
    const reactivated = await reactivateMenuItem(id, profile, repository);
    return {
      success: true as const,
      item: serializeMenuItem(reactivated),
    };
  });
}

export type { ActionFailure, MenuItemDto };
