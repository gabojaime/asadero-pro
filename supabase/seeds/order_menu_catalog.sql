-- Local/dev seed: example asadero menu catalog per merchant (idempotent).

INSERT INTO menu_items (
  merchant_id,
  name,
  item_kind,
  protein_group,
  weight_label,
  price,
  is_active
)
SELECT
  m.id,
  c.name,
  c.item_kind,
  c.protein_group,
  c.weight_label,
  c.price,
  true
FROM merchants m
CROSS JOIN (
  VALUES
    ('Beef 1 kg', 'meat_plate'::menu_item_kind, 'beef', '1kg', 44.00),
    ('Beef 1/2 kg', 'meat_plate'::menu_item_kind, 'beef', '500g', 24.00),
    ('Beef 1/4 kg', 'meat_plate'::menu_item_kind, 'beef', '250g', 13.00),
    ('Pork belly 1 kg', 'meat_plate'::menu_item_kind, 'pork', '1kg', 42.00),
    ('Pork belly 1/2 kg', 'meat_plate'::menu_item_kind, 'pork', '500g', 23.00),
    ('Pork belly 1/4 kg', 'meat_plate'::menu_item_kind, 'pork', '250g', 12.00),
    ('Chicken 1 kg', 'meat_plate'::menu_item_kind, 'chicken', '1kg', 38.00),
    ('Chicken 1/2 kg', 'meat_plate'::menu_item_kind, 'chicken', '500g', 21.00),
    ('Chicken 1/4 kg', 'meat_plate'::menu_item_kind, 'chicken', '250g', 11.00),
    ('Nestea', 'drink'::menu_item_kind, NULL, NULL, 3.50),
    ('Coca-Cola', 'drink'::menu_item_kind, NULL, NULL, 1.30),
    ('Yuca', 'side'::menu_item_kind, NULL, NULL, 0.00),
    ('Arepa', 'side'::menu_item_kind, NULL, NULL, 0.00),
    ('Shredded salad', 'side'::menu_item_kind, NULL, NULL, 0.00)
) AS c(name, item_kind, protein_group, weight_label, price)
WHERE NOT EXISTS (
  SELECT 1
  FROM menu_items mi
  WHERE mi.merchant_id = m.id
    AND lower(trim(mi.name)) = lower(trim(c.name))
);
