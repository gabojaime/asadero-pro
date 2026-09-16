export type MenuItemKind = "meat_plate" | "drink" | "side";
export type ProteinGroup = "beef" | "pork" | "chicken";

export interface MenuItem {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: MenuItemKind;
  proteinGroup: ProteinGroup | null;
  weightLabel: string | null;
  isActive: boolean;
  createdAt: Date;
}

export type ListMenuItemsFilters = {
  activeOnly?: boolean;
};

export type CreateMenuItemInput = {
  name: string;
  price: number;
  itemKind: MenuItemKind;
  proteinGroup: ProteinGroup | null;
  weightLabel: string | null;
};

export type UpdateMenuItemInput = {
  name: string;
  price: number;
  proteinGroup: ProteinGroup | null;
  weightLabel: string | null;
};
