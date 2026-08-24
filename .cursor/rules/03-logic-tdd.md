# Core Business Logic & Testing Harness (mvp-logic-tdd.md)

This specification details the core business logic implementations and unit testing standards for the BBQ MVP. It serves as a direct reference for AI agents writing or refactoring backend logic and unit tests.

---

## 1. PURE IMMUTABLE BUSINESS LOGIC (TypeScript)

To avoid side effects, bugs during parallel executions, or corrupted state caching, write pure functions with immutable modifications.

### Type Definitions
```typescript
export interface RawMaterial {
  id: string;
  name: string;
  stockKg: number;
  unitCost: number;
}

export interface RecipeIngredient {
  rawMaterialId: string;
  quantityKg: number; // Amount of raw material required per plate
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  recipe: RecipeIngredient[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  tableNumber: number;
  items: CartItem[];
  status: 'pending' | 'cooking' | 'served' | 'completed' | 'cancelled';
}
```

### Immutable Cart Operations
```typescript
/**
 * Adds an item to the cart or increments its quantity if it already exists,
 * returning a new deep copy of the items list.
 */
export const addItemToCart = (items: CartItem[], newItem: MenuItem): CartItem[] => {
  const existingItemIndex = items.findIndex(item => item.menuItem.id === newItem.id);

  if (existingItemIndex > -1) {
    return items.map((item, idx) => 
      idx === existingItemIndex 
        ? { ...item, quantity: item.quantity + 1 } 
        : item
    );
  }

  return [...items, { menuItem: newItem, quantity: 1 }];
};

/**
 * Calculates the total cost of items in the cart.
 */
export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
};
```

### Automated Recipe Inventory Deduction
```typescript
export interface InventoryDeductionResult {
  updatedInventory: RawMaterial[];
  isValid: boolean;
  insufficientMaterials: string[]; // Lists names of materials that violate stock limits
}

/**
 * Validates and calculates inventory deductions for an order based on recipes.
 * Does not mutate inputs; returns a cloned result state.
 */
export const processOrderDeduction = (
  orderItems: CartItem[], 
  currentInventory: RawMaterial[]
): InventoryDeductionResult => {
  const insufficientMaterials: string[] = [];
  const inventoryMap = new Map(currentInventory.map(item => [item.id, { ...item }]));

  // Calculate required totals of raw ingredients across all cart items
  for (const cartItem of orderItems) {
    for (const ingredient of cartItem.menuItem.recipe) {
      const inventoryItem = inventoryMap.get(ingredient.rawMaterialId);
      if (!inventoryItem) continue;

      const totalRequired = ingredient.quantityKg * cartItem.quantity;
      if (inventoryItem.stockKg < totalRequired) {
        if (!insufficientMaterials.includes(inventoryItem.name)) {
          insufficientMaterials.push(inventoryItem.name);
        }
      } else {
        inventoryItem.stockKg = parseFloat((inventoryItem.stockKg - totalRequired).toFixed(3));
      }
    }
  }

  const isValid = insufficientMaterials.length === 0;

  return {
    updatedInventory: isValid ? Array.from(inventoryMap.values()) : currentInventory,
    isValid,
    insufficientMaterials
  };
};
```

---

## 2. TESTING CRITERIA (TDD & AAA PATTERN)

Every unit test written by AI agents must adhere to the **Arrange-Act-Assert (AAA)** structure to enforce clean setup and isolation.

### The AAA Standard
1. **Arrange (Setup)**: Initialize the system under test (SUT) with isolated data. Never depend on global variables or test database connections that persist modifications.
2. **Act (Execution)**: Trigger the target function or action. Keep this step small (usually a single function invocation).
3. **Assert (Validation)**: Make precise expectations of the result. Do not write bloated "all-knowing oracles" that check unrelated data fields.
4. **Cleanup**: Tear down mock configurations and reset any timers or static counters.

### Example Unit Test (Jest/Vitest)
```typescript
import { processOrderDeduction, RawMaterial, MenuItem } from './order-logic';

describe('BBQ Inventory Recipe Deduction', () => {
  let mockInventory: RawMaterial[];
  let mockArracheraPlate: MenuItem;

  // Setup runs before each test to ensure perfect isolation
  beforeEach(() => {
    mockInventory = [
      { id: 'mat-1', name: 'raw_arrachera', stockKg: 10.000, unitCost: 15.00 },
      { id: 'mat-2', name: 'charcoal', stockKg: 50.000, unitCost: 1.20 }
    ];

    mockArracheraPlate = {
      id: 'menu-1',
      name: 'Arrachera Plate 300g',
      price: 24.99,
      recipe: [
        { rawMaterialId: 'mat-1', quantityKg: 0.300 }, // Needs 300g raw meat
        { rawMaterialId: 'mat-2', quantityKg: 0.100 }  // Needs 100g charcoal
      ]
    };
  });

  it('should deduct ingredients correctly for a valid order', () => {
    // Arrange
    const cartItems = [{ menuItem: mockArracheraPlate, quantity: 2 }];

    // Act
    const result = processOrderDeduction(cartItems, mockInventory);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.insufficientMaterials).toHaveLength(0);
    
    // Check specific raw materials deductions
    const updatedArrachera = result.updatedInventory.find(item => item.id === 'mat-1');
    const updatedCharcoal = result.updatedInventory.find(item => item.id === 'mat-2');
    
    expect(updatedArrachera?.stockKg).toBe(9.400); // 10.000 - (0.300 * 2) = 9.400
    expect(updatedCharcoal?.stockKg).toBe(49.800); // 50.000 - (0.100 * 2) = 49.800
  });

  it('should return invalid status and block deduction if raw meat stock is insufficient', () => {
    // Arrange (Scale up quantity to exceed stock)
    const cartItems = [{ menuItem: mockArracheraPlate, quantity: 40 }];

    // Act
    const result = processOrderDeduction(cartItems, mockInventory);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.insufficientMaterials).toContain('raw_arrachera');
    // Ensure inventory was NOT updated
    expect(result.updatedInventory).toEqual(mockInventory);
  });
});
```

---

## 3. ANTI-PATTERNS PROHIBITED FOR AI AGENTS

Agents must fail static validation or pull requests if they write code containing:
- **Mutable Arrays/Objects updates**: Do not use methods like `Array.prototype.push()` or inline mutations on objects without clone operations.
- **Interdependent Tests**: Tests must be runnable in any order. Never write a test that requires a preceding test to run and prepare database states.
- **Vague Asserts**: Avoid `expect(true).toBe(true)` or validating an entire large payload structure when only one property is under evaluation.
- **All-Knowing Oracles**: Do not couple assertions to irrelevant fields (like check timestamps or autogenerated ids) as it makes tests fragile to unrelated schema updates.
