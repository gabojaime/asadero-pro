-- Local/dev seed: recipe links + default waste_pct for meat plates (idempotent).

INSERT INTO recipe_ingredients (menu_item_id, raw_material_id, quantity_kg)
SELECT
  mi.id,
  rm.id,
  CASE mi.weight_label
    WHEN '1kg' THEN 1.000
    WHEN '500g' THEN 0.500
    WHEN '250g' THEN 0.250
    ELSE NULL
  END
FROM menu_items mi
INNER JOIN raw_materials_inventory rm
  ON rm.merchant_id = mi.merchant_id
 AND rm.is_active = true
 AND (
   (mi.protein_group = 'beef' AND lower(trim(rm.name)) = 'carne')
   OR (mi.protein_group = 'pork' AND lower(trim(rm.name)) = 'cochino')
   OR (mi.protein_group = 'chicken' AND lower(trim(rm.name)) = 'pollo')
 )
WHERE mi.item_kind = 'meat_plate'
  AND mi.is_active = true
  AND mi.weight_label IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM recipe_ingredients ri
    WHERE ri.menu_item_id = mi.id
  );

INSERT INTO menu_item_costing (merchant_id, menu_item_id, waste_pct)
SELECT
  mi.merchant_id,
  mi.id,
  CASE mi.protein_group
    WHEN 'beef' THEN 30.00
    WHEN 'pork' THEN 25.00
    WHEN 'chicken' THEN 20.00
    ELSE NULL
  END
FROM menu_items mi
WHERE mi.item_kind = 'meat_plate'
  AND mi.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM menu_item_costing mic
    WHERE mic.menu_item_id = mi.id
  );
