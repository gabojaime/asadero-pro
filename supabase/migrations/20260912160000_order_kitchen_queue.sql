-- Order kitchen queue: menu taxonomy, sides, delivery fields, role-aware RLS, Realtime

CREATE TYPE menu_item_kind AS ENUM ('meat_plate', 'drink', 'side');

ALTER TABLE menu_items
  ADD COLUMN item_kind menu_item_kind NOT NULL DEFAULT 'meat_plate',
  ADD COLUMN protein_group TEXT NULL CHECK (protein_group IN ('beef', 'pork', 'chicken')),
  ADD COLUMN weight_label TEXT NULL;

COMMENT ON COLUMN menu_items.item_kind IS 'Sales category: meat plates require two sides; sides are selectable contornos.';
COMMENT ON COLUMN menu_items.protein_group IS 'UI grouping for meat plates (beef, pork, chicken).';
COMMENT ON COLUMN menu_items.weight_label IS 'Display portion label e.g. 1kg, 500g, 250g.';

CREATE TABLE order_item_sides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  side_menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  UNIQUE (order_item_id, slot)
);

COMMENT ON TABLE order_item_sides IS 'Two included sides per meat plate line.';

CREATE INDEX idx_order_item_sides_item ON order_item_sides(order_item_id);

ALTER TABLE orders
  ADD COLUMN sent_to_kitchen_at TIMESTAMPTZ,
  ADD COLUMN ready_at TIMESTAMPTZ,
  ADD COLUMN delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN delivery_zone TEXT NULL;

COMMENT ON COLUMN orders.delivery_fee IS 'Manually entered delivery cost at order time. Zero for takeaway.';
COMMENT ON COLUMN orders.delivery_zone IS 'Optional free-text zone label for dispatch (e.g. Centro). Not a FK to a zones catalog.';

ALTER TABLE orders
  ADD CONSTRAINT orders_delivery_fee_non_negative CHECK (delivery_fee >= 0);

CREATE INDEX idx_orders_active_kitchen
  ON orders (merchant_id, sent_to_kitchen_at)
  WHERE status IN ('pending', 'cooking');

-- Realtime for kitchen queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Replace blanket order policies with role-aware policies
DROP POLICY IF EXISTS "Users can manage orders of their merchant" ON orders;

CREATE POLICY "Staff read orders of their merchant"
ON orders FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Waiters and admins insert orders"
ON orders FOR INSERT TO authenticated
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() IN ('waiter', 'admin')
);

CREATE POLICY "Grillmasters and admins update order status"
ON orders FOR UPDATE TO authenticated
USING (merchant_id = get_user_merchant_id())
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() IN ('grill_master', 'admin')
);

-- Replace blanket order_items policy
DROP POLICY IF EXISTS "Users can manage order items" ON order_items;

CREATE POLICY "Staff read order items of their merchant"
ON order_items FOR SELECT TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE merchant_id = get_user_merchant_id()
  )
);

CREATE POLICY "Waiters and admins insert order items"
ON order_items FOR INSERT TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM orders WHERE merchant_id = get_user_merchant_id()
  )
  AND get_user_role() IN ('waiter', 'admin')
);

-- order_item_sides RLS
ALTER TABLE order_item_sides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read order item sides of their merchant"
ON order_item_sides FOR SELECT TO authenticated
USING (
  order_item_id IN (
    SELECT oi.id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.merchant_id = get_user_merchant_id()
  )
);

CREATE POLICY "Waiters and admins insert order item sides"
ON order_item_sides FOR INSERT TO authenticated
WITH CHECK (
  order_item_id IN (
    SELECT oi.id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.merchant_id = get_user_merchant_id()
  )
  AND get_user_role() IN ('waiter', 'admin')
);
