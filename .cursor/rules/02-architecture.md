# Architecture Specification: Hexagonal Architecture for MVP

This document specifies the **Hexagonal Architecture (Ports and Adapters)** pattern tailored for our Next.js + Supabase + TanStack Query MVP. This architecture isolates core business logic from frameworks, databases, and UI clients, creating a highly predictable, modular, and AI-optimizable codebase.

---

## 1. Core Principles & The Golden Rule

The fundamental law of Hexagonal Architecture is: **Dependencies always point inwards.** [3]

```
             ┌──────────────────────────────────────────────┐
             │                 PRESENTATION                 │
             │             (React Components)               │
             └──────────────────────┬───────────────────────┘
                                    │ (uses)
                                    ▼
             ┌──────────────────────────────────────────────┐
             │                 APPLICATION                  │
             │                 (Use Cases)                  │
             └──────────────────────┬───────────────────────┘
                                    │ (orchestrates)
                                    ▼
             ┌──────────────────────────────────────────────┐
             │                    DOMAIN                    │
             │        (Entities, Rules, Validations)        │
             └──────────────────────────────────────────────┘
                                    ▲
                                    │ (implements)
             ┌──────────────────────┴───────────────────────┐
             │                INFRASTRUCTURE                │
             │           (Supabase, React Query)            │
             └──────────────────────────────────────────────┘
```

*   **The Domain is the Core**: It contains the pure business rules (e.g., raw material conversions, recipe calculations) [5]. It has **zero dependencies** on external libraries (no React, no Supabase, no TanStack Query) [8, 9].
*   **Ports (Interfaces)**: Defined in the Domain/Application layers, specifying *what* operations the core needs (e.g., `RawMaterialRepository` interface) [10].
*   **Adapters (Implementations)**: Reside in the Infrastructure and Presentation layers, defining *how* to interact with the world (e.g., Supabase SQL calls, React views) [11, 12].

---

## 2. Folder Scaffolding (Next.js App Router)

We organize the project **by business domain** (cohesive vertical slices) rather than technical type (controllers, models, views) [9]. 

```
src/
├── domains/                         # Business Domain Modules
│   ├── raw-materials/               # Raw Materials Inventory Domain
│   │   ├── domain/                  # Layer 1: Pure Business Logic
│   │   │   ├── entities.ts          # Pure TS types and entity models [10]
│   │   │   ├── repository.ts        # Port: Interface defining database contract [10]
│   │   │   └── validations.ts       # Pure business validation functions [8, 10]
│   │   ├── application/             # Layer 2: Use Cases
│   │   │   └── use-cases.ts         # Direct actions (e.g., updateStock) [11]
│   │   ├── infrastructure/          # Layer 3: Adapters (DB, API Clients)
│   │   │   ├── supabase-repo.ts     # Supabase database implementation of repository
│   │   │   └── query-adapters.ts    # TanStack Query custom hooks
│   │   └── presentation/            # Layer 4: UI Builders [7]
│   │       ├── components/          # React components [12]
│   │       └── InventoryView.tsx    # Domain Dashboard Subpage
│   │
│   ├── orders/                      # Orders & Cart Domain
│   └── metrics/                     # Analytics Dashboard Domain
│
├── app/                             # Next.js Routing Layer (Strictly Presentation) [18]
│   ├── layout.tsx                   # Global UI Layout
│   ├── page.tsx                     # Landing Page
│   └── dashboard/
│       ├── page.tsx                 # Instantiates Metrics & Inventory Views
│       └── raw-materials/
│           └── page.tsx             # Instantiates InventoryView [18]
│
└── shared/                          # Cross-domain utilities, shared styles/types [18]
```

---

## 3. The Metaphor of the House: The 4 Layers [4]

### Layer 1: Blueprint (Domain Layer) [5]
*   **Analogy**: The structural blueprint of a house. It dictates the dimensions and rules (e.g., a room must have doors) but does not build them [5].
*   **Rules**:
    *   Must be **Pure TypeScript** [10].
    *   **Prohibited Imports**: `@supabase/supabase-js`, `@tanstack/react-query`, `react`, `next/dynamic`.
    *   Contains entities, value objects, and business math (e.g., calculating recipe weight deductions).

### Layer 2: Instructions (Application Layer) [5]
*   **Analogy**: Building instructions that say "secure the beam using an appropriate fastening tool." It doesn't care if you use a drill or a hammer [5].
*   **Rules**:
    *   Contains use cases (the user actions) [6, 11].
    *   Orchestrates flow: Fetch from Repository -> Validate with Domain -> Save to Repository [11].
    *   Depends only on Domain interfaces (Ports), never concrete implementations [11].

### Layer 3: Tools & Materials (Infrastructure Layer) [6]
*   **Analogy**: The physical hammer, drill, and concrete [6].
*   **Rules**:
    *   Implements the Repository interfaces defined in Domain [6, 11].
    *   Uses **Supabase** clients and writes actual Postgres query calls [11].
    *   Contains **TanStack React Query** configurations, keys, and custom query/mutation wrappers.

### Layer 4: Builders (Presentation Layer) [7]
*   **Analogy**: The workers building and painting the house to make it visible to the owner [7].
*   **Rules**:
    *   Contains React Components, layouts, and page views [12].
    *   Subscribes to custom React Query hooks from Infrastructure to receive data streams [12].
    *   Handles UI-state (modals, inputs, interactive graphs) and loading/error feedback.

---

## 4. Code Scaffolding Templates (TypeScript)

### 4.1 Domain Layer (`domains/raw-materials/domain/`)

#### Entity Definition (`entities.ts`)
```typescript
/**
 * RawMaterial represents the physical crude stock (e.g., arrachera, pork rib).
 * All weight metrics must utilize kilograms with 3 decimal places for gram precision.
 */
export interface RawMaterial {
  id: string;
  merchantId: string;
  name: string;
  sku: string;
  currentStockKg: number;
  safetyStockKg: number;
  unitCost: number;
  updatedAt: Date;
}

export interface StockTransaction {
  id: string;
  materialId: string;
  quantityKg: number;
  type: 'INCOMING' | 'OUTGOING' | 'WASTE';
  reason: string;
  createdAt: Date;
}
```

#### Validation Logic (`validations.ts`)
```typescript
import { RawMaterial } from './entities';

/**
 * Validates if the added transaction does not force stock below zero.
 * Pure business rule - completely testable in isolation.
 */
export const isStockSufficient = (
  material: RawMaterial,
  deductionKg: number
): boolean => {
  return material.currentStockKg - deductionKg >= 0;
};

/**
 * Checks if a material is critically low and requires replenishment.
 */
export const isStockCriticallyLow = (material: RawMaterial): boolean => {
  return material.currentStockKg <= material.safetyStockKg;
};
```

#### Repository Port Interface (`repository.ts`)
```typescript
import { RawMaterial, StockTransaction } from './entities';

/**
 * Port contract for database operations.
 * High-level specification of data needs.
 */
export interface RawMaterialRepository {
  getById(id: string): Promise<RawMaterial>;
  getAll(merchantId: string): Promise<RawMaterial[]>;
  updateStock(id: string, quantityKg: number): Promise<RawMaterial>;
  logTransaction(transaction: Omit<StockTransaction, 'id' | 'createdAt'>): Promise<StockTransaction>;
}
```

---

### 4.2 Application Layer (`domains/raw-materials/application/`)

#### Use Case Orchestrator (`use-cases.ts`)
```typescript
import { RawMaterialRepository } from '../domain/repository';
import { isStockSufficient } from '../domain/validations';
import { RawMaterial } from '../domain/entities';

export class RawMaterialUseCases {
  constructor(private repo: RawMaterialRepository) {}

  /**
   * Processes waste deduction of meat (e.g. overcooked ribs).
   * Orchestrates domain validation before sending to repository.
   */
  async processWasteDeduction(
    materialId: string,
    quantityKg: number,
    reason: string
  ): Promise<RawMaterial> {
    const material = await this.repo.getById(materialId);

    if (!isStockSufficient(material, quantityKg)) {
      throw new Error(`Insufficient stock for material ${material.name}. Operation aborted.`);
    }

    // Deduct stock using negative quantity
    const updatedMaterial = await this.repo.updateStock(materialId, -quantityKg);
    
    // Log transaction record
    await this.repo.logTransaction({
      materialId,
      quantityKg: -quantityKg,
      type: 'WASTE',
      reason
    });

    return updatedMaterial;
  }
}
```

---

### 4.3 Infrastructure Layer (`domains/raw-materials/infrastructure/`)

#### Supabase Database Adapter (`supabase-repo.ts`)
```typescript
import { createClient } from '@/lib/supabase/client'; // App level supabase client helper
import { RawMaterialRepository } from '../domain/repository';
import { RawMaterial, StockTransaction } from '../domain/entities';

export class SupabaseRawMaterialRepository implements RawMaterialRepository {
  private supabase = createClient();

  async getById(id: string): Promise<RawMaterial> {
    const { data, error } = await this.supabase
      .from('raw_materials_inventory')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(`Database error: ${error?.message || 'Material not found'}`);
    }

    return this.mapToDomain(data);
  }

  async getAll(merchantId: string): Promise<RawMaterial[]> {
    const { data, error } = await this.supabase
      .from('raw_materials_inventory')
      .select('*')
      .eq('merchant_id', merchantId);

    if (error) throw new Error(error.message);
    return data.map(this.mapToDomain);
  }

  async updateStock(id: string, quantityKg: number): Promise<RawMaterial> {
    // Uses PostgreSQL atomic increments for safety
    const { data, error } = await this.supabase
      .rpc('increment_material_stock', { 
        material_id: id, 
        increment_amount: quantityKg 
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToDomain(data);
  }

  async logTransaction(
    transaction: Omit<StockTransaction, 'id' | 'createdAt'>
  ): Promise<StockTransaction> {
    const { data, error } = await this.supabase
      .from('stock_transactions_log')
      .insert({
        material_id: transaction.materialId,
        quantity_kg: transaction.quantityKg,
        type: transaction.type,
        reason: transaction.reason
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      id: data.id,
      materialId: data.material_id,
      quantityKg: Number(data.quantity_kg),
      type: data.type,
      reason: data.reason,
      createdAt: new Date(data.created_at)
    };
  }

  private mapToDomain(dbRow: any): RawMaterial {
    return {
      id: dbRow.id,
      merchantId: dbRow.merchant_id,
      name: dbRow.name,
      sku: dbRow.sku,
      currentStockKg: Number(dbRow.current_stock_kg),
      safetyStockKg: Number(dbRow.safety_stock_kg),
      unitCost: Number(dbRow.unit_cost),
      updatedAt: new Date(dbRow.updated_at)
    };
  }
}
```

#### TanStack Query Cache Adapters (`query-adapters.ts`)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseRawMaterialRepository } from './supabase-repo';
import { RawMaterialUseCases } from '../application/use-cases';

const repo = new SupabaseRawMaterialRepository();
const useCases = new RawMaterialUseCases(repo);

export const rawMaterialKeys = {
  all: (merchantId: string) => ['raw-materials', merchantId] as const,
  detail: (id: string) => ['raw-materials', 'detail', id] as const,
};

export function useRawMaterials(merchantId: string) {
  return useQuery({
    queryKey: rawMaterialKeys.all(merchantId),
    queryFn: () => repo.getAll(merchantId),
  });
}

export function useWasteDeductionMutation(merchantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialId, quantityKg, reason }: { materialId: string; quantityKg: number; reason: string }) =>
      useCases.processWasteDeduction(materialId, quantityKg, reason),
    onSuccess: () => {
      // Invalidate cache immediately to update Dashboard charts
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all(merchantId) });
    },
  });
}
```

---

## 5. Guidelines for Cursor AI Agents

Ensure all Cursor composer, chat, and agent tasks align strictly with these architectural constraints:

1.  **Never Mix Layers**: If an agent is tasked with adding a field to an inventory item, it must first modify `domain/entities.ts` [10], then update database mappings in `infrastructure/supabase-repo.ts` [11], and lastly update the React components in `presentation/` [12].
2.  **No Direct Imports**: `presentation/` and `app/` files must never import `@supabase/supabase-js`. All state interactions must flow through TanStack Query Adapters inside `infrastructure/query-adapters.ts`.
3.  **Strict English Rule**: Variables, comments, schema definitions, and parameters must be in English. No exceptions.
4.  **Testability First**: Pure validation tests (TDD) must target only files in the `domain/` folder, ensuring we never have to mock third-party routing, DB pools, or UI states to verify business rules [14].
