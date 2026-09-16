import type { SessionProfile } from "@/domains/auth/domain/entities";
import type {
  CreateMenuItemInput,
  ListMenuItemsFilters,
  MenuItem,
  MenuItemKind,
  UpdateMenuItemInput,
} from "../domain/entities";
import { MenuItemError } from "../domain/errors";
import type { MenuItemRepository } from "../domain/repository";
import {
  parseCreateMenuItemInput,
  validateUpdateForKind,
} from "../domain/validations";

function assertAdmin(profile: SessionProfile): void {
  if (profile.role !== "admin") {
    throw new MenuItemError(
      "forbidden",
      "Solo los administradores pueden gestionar el menú.",
    );
  }

  if (!profile.merchantId) {
    throw new MenuItemError(
      "forbidden",
      "Se requiere el contexto del negocio.",
    );
  }
}

const KIND_SORT_ORDER: Record<MenuItemKind, number> = {
  meat_plate: 0,
  drink: 1,
  side: 2,
};

function sortMenuItems(items: MenuItem[]): MenuItem[] {
  return [...items].sort((left, right) => {
    const kindDiff =
      KIND_SORT_ORDER[left.itemKind] - KIND_SORT_ORDER[right.itemKind];
    if (kindDiff !== 0) {
      return kindDiff;
    }
    return left.name.localeCompare(right.name, "es");
  });
}

export async function listMenuItems(
  profile: SessionProfile,
  filters: ListMenuItemsFilters | undefined,
  repository: MenuItemRepository,
): Promise<MenuItem[]> {
  assertAdmin(profile);

  const items = await repository.listByMerchant(profile.merchantId!, filters);
  return sortMenuItems(items);
}

export async function createMenuItem(
  input: CreateMenuItemInput,
  profile: SessionProfile,
  repository: MenuItemRepository,
): Promise<MenuItem> {
  assertAdmin(profile);

  const validation = parseCreateMenuItemInput(input);
  if (!validation.success) {
    throw new MenuItemError(
      "validation_failed",
      "Datos del ítem de menú no válidos.",
      validation.fieldErrors,
    );
  }

  return repository.create({
    ...validation.data,
    merchantId: profile.merchantId!,
  });
}

export async function updateMenuItem(
  id: string,
  input: UpdateMenuItemInput,
  profile: SessionProfile,
  repository: MenuItemRepository,
): Promise<MenuItem> {
  assertAdmin(profile);

  const existing = await repository.getById(id);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new MenuItemError("not_found", "Ítem de menú no encontrado.");
  }

  const validation = validateUpdateForKind(existing.itemKind, input);
  if (!validation.success) {
    throw new MenuItemError(
      "validation_failed",
      "Datos del ítem de menú no válidos.",
      validation.fieldErrors,
    );
  }

  return repository.update(id, validation.data);
}

export async function deactivateMenuItem(
  id: string,
  profile: SessionProfile,
  repository: MenuItemRepository,
): Promise<MenuItem> {
  assertAdmin(profile);

  const existing = await repository.getById(id);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new MenuItemError("not_found", "Ítem de menú no encontrado.");
  }

  return repository.setActive(id, false);
}

export async function reactivateMenuItem(
  id: string,
  profile: SessionProfile,
  repository: MenuItemRepository,
): Promise<MenuItem> {
  assertAdmin(profile);

  const existing = await repository.getById(id);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new MenuItemError("not_found", "Ítem de menú no encontrado.");
  }

  return repository.setActive(id, true);
}

export function assertItemKindImmutable(
  existingKind: MenuItemKind,
  requestedKind: MenuItemKind | undefined,
): void {
  if (requestedKind !== undefined && requestedKind !== existingKind) {
    throw new MenuItemError(
      "kind_immutable",
      "El tipo de ítem no se puede cambiar después de crearlo.",
    );
  }
}
