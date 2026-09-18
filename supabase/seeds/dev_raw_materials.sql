-- Local/dev seed: 18 floor raw materials per merchant (idempotent).
-- Names/UoM must stay in sync with src/domains/raw-materials/domain/starter-catalog.ts
-- (admins can also load the same catalog from empty /inventory in the app).
-- Requires at least one row in merchants (run onboarding, then re-seed if needed).

INSERT INTO raw_materials_inventory (
  merchant_id,
  name,
  unit_of_measure,
  quantity_on_hand,
  unit_cost,
  is_active
)
SELECT
  m.id,
  c.name,
  c.uom,
  0,
  0,
  true
FROM merchants m
CROSS JOIN (
  VALUES
    ('Carne', 'kilogram'::unit_of_measure),
    ('Pollo', 'kilogram'::unit_of_measure),
    ('Cochino', 'kilogram'::unit_of_measure),
    ('Sal gruesa', 'kilogram'::unit_of_measure),
    ('Pimienta', 'kilogram'::unit_of_measure),
    ('Envases', 'unit'::unit_of_measure),
    ('Bolsas', 'unit'::unit_of_measure),
    ('Cubiertos', 'unit'::unit_of_measure),
    ('Toallin', 'unit'::unit_of_measure),
    ('Guantes', 'unit'::unit_of_measure),
    ('Carbón', 'kilogram'::unit_of_measure),
    ('Aceite', 'kilogram'::unit_of_measure),
    ('Cubito', 'unit'::unit_of_measure),
    ('Verduras', 'kilogram'::unit_of_measure),
    ('Mostaza', 'kilogram'::unit_of_measure),
    ('Mayonesa', 'kilogram'::unit_of_measure),
    ('Miel', 'kilogram'::unit_of_measure),
    ('Papel aluminio', 'unit'::unit_of_measure)
) AS c(name, uom)
WHERE NOT EXISTS (
  SELECT 1
  FROM raw_materials_inventory r
  WHERE r.merchant_id = m.id
    AND lower(trim(r.name)) = lower(trim(c.name))
);
