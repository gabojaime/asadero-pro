import type {
  CreateMenuItemInput,
  MenuItem,
  ListMenuItemsFilters,
  UpdateMenuItemInput,
} from "./entities";

export type CreateMenuItemPayload = CreateMenuItemInput & {
  merchantId: string;
};

export interface MenuItemRepository {
  listByMerchant(
    merchantId: string,
    filters?: ListMenuItemsFilters,
  ): Promise<MenuItem[]>;
  getById(id: string): Promise<MenuItem | null>;
  create(input: CreateMenuItemPayload): Promise<MenuItem>;
  createMany(inputs: CreateMenuItemPayload[]): Promise<MenuItem[]>;
  update(id: string, input: UpdateMenuItemInput): Promise<MenuItem>;
  setActive(id: string, isActive: boolean): Promise<MenuItem>;
}
