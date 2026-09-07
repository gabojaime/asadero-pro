export type UnitOfMeasure = "kilogram" | "unit";

export interface RawMaterial {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  unitOfMeasure: UnitOfMeasure;
  quantityOnHand: number;
  unitCost: number;
  isActive: boolean;
  updatedAt: Date;
}

export interface InventoryMovement {
  id: string;
  merchantId: string;
  rawMaterialId: string;
  movementType: "receipt";
  quantity: number;
  unitCost: number;
  recordedBy: string | null;
  createdAt: Date;
}

export interface ReceiveStockInput {
  incomingQuantity: number;
  incomingUnitCost: number;
}

export interface CreateRawMaterialInput {
  name: string;
  sku?: string | null;
  unitOfMeasure: UnitOfMeasure;
}

export interface UpdateRawMaterialInput {
  name: string;
  sku?: string | null;
}

export interface ListRawMaterialsFilters {
  activeOnly?: boolean;
}
