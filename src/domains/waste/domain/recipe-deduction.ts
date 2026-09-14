export type RecipeLink = {
  menuItemId: string;
  rawMaterialId: string;
  quantityKg: number;
};

export type OrderLineForDeduction = {
  menuItemId: string;
  quantity: number;
};

export type RecipeDeductionAggregate = {
  rawMaterialId: string;
  totalKg: number;
};

export function aggregateRecipeDeductions(
  lines: ReadonlyArray<OrderLineForDeduction>,
  recipes: ReadonlyArray<RecipeLink>,
): ReadonlyArray<RecipeDeductionAggregate> {
  const recipeByMenuItemId = new Map(
    recipes.map((recipe) => [recipe.menuItemId, recipe]),
  );
  const totals = new Map<string, number>();

  for (const line of lines) {
    const recipe = recipeByMenuItemId.get(line.menuItemId);
    if (!recipe) {
      continue;
    }

    const lineKg = recipe.quantityKg * line.quantity;
    totals.set(
      recipe.rawMaterialId,
      (totals.get(recipe.rawMaterialId) ?? 0) + lineKg,
    );
  }

  return [...totals.entries()].map(([rawMaterialId, totalKg]) => ({
    rawMaterialId,
    totalKg,
  }));
}
