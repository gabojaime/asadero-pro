import type {
  CreateRawMaterialInput,
  InventoryMovement,
  ListRawMaterialsFilters,
  RawMaterial,
  UpdateRawMaterialInput,
} from "./entities";

export interface CreateRawMaterialPayload extends CreateRawMaterialInput {
  merchantId: string;
}

export interface RawMaterialRepository {
  listByMerchant(
    merchantId: string,
    filters?: ListRawMaterialsFilters,
  ): Promise<RawMaterial[]>;
  getById(id: string): Promise<RawMaterial | null>;
  create(input: CreateRawMaterialPayload): Promise<RawMaterial>;
  createMany(inputs: CreateRawMaterialPayload[]): Promise<RawMaterial[]>;
  update(id: string, input: UpdateRawMaterialInput): Promise<RawMaterial>;
  deactivate(id: string): Promise<RawMaterial>;
  applyReceipt(params: {
    rawMaterialId: string;
    quantityOnHand: number;
    unitCost: number;
    movementQuantity: number;
    movementUnitCost: number;
  }): Promise<RawMaterial>;
  listMovements(
    rawMaterialId: string,
    limit?: number,
  ): Promise<InventoryMovement[]>;
}
