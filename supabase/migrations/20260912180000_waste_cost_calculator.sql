-- Waste cost calculator: costing tables, recipe RLS tightening, order completion deduction

-- Part 1: Merchant target food cost ratio
ALTER TABLE merchants
  ADD COLUMN target_food_cost_pct DECIMAL(5, 4) NOT NULL DEFAULT 0.3300;

COMMENT ON COLUMN merchants.target_food_cost_pct IS
  'Target food cost ratio (e.g. 0.33 = 33% food cost target for optimal pricing).';

-- Part 2: Per-menu-item waste percentage (costing only)
CREATE TABLE menu_item_costing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  waste_pct DECIMAL(5, 2) NULL CHECK (waste_pct >= 0 AND waste_pct < 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (menu_item_id)
);

CREATE INDEX idx_menu_item_costing_merchant ON menu_item_costing (merchant_id);

COMMENT ON TABLE menu_item_costing IS
  'Admin-configured waste percentage per menu item for costing and recommended pricing.';

CREATE OR REPLACE FUNCTION enforce_menu_item_costing_merchant_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_menu_merchant_id UUID;
BEGIN
  SELECT merchant_id INTO v_menu_merchant_id
  FROM menu_items
  WHERE id = NEW.menu_item_id;

  IF v_menu_merchant_id IS NULL THEN
    RAISE EXCEPTION 'menu_item_not_found';
  END IF;

  IF NEW.merchant_id IS DISTINCT FROM v_menu_merchant_id THEN
    RAISE EXCEPTION 'merchant_mismatch';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_costing_merchant_match
  BEFORE INSERT OR UPDATE ON menu_item_costing
  FOR EACH ROW
  EXECUTE FUNCTION enforce_menu_item_costing_merchant_match();

ALTER TABLE menu_item_costing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read menu item costing for their merchant"
ON menu_item_costing FOR SELECT TO authenticated
USING (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can insert menu item costing for their merchant"
ON menu_item_costing FOR INSERT TO authenticated
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can update menu item costing for their merchant"
ON menu_item_costing FOR UPDATE TO authenticated
USING (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'::user_role
)
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can update target food cost for their merchant"
ON merchants FOR UPDATE TO authenticated
USING (
  id = get_user_merchant_id()
  AND get_user_role() = 'admin'::user_role
)
WITH CHECK (
  id = get_user_merchant_id()
  AND get_user_role() = 'admin'::user_role
);

-- Part 3: Tighten recipe_ingredients — tenant read, admin-only writes
DROP POLICY IF EXISTS "Users can manage recipe ingredients of their merchant" ON recipe_ingredients;

CREATE POLICY "Users can read recipe ingredients of their merchant"
ON recipe_ingredients FOR SELECT TO authenticated
USING (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE merchant_id = get_user_merchant_id()
  )
);

CREATE POLICY "Admins can insert recipe ingredients for their merchant"
ON recipe_ingredients FOR INSERT TO authenticated
WITH CHECK (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE merchant_id = get_user_merchant_id()
  )
  AND get_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can update recipe ingredients for their merchant"
ON recipe_ingredients FOR UPDATE TO authenticated
USING (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE merchant_id = get_user_merchant_id()
  )
  AND get_user_role() = 'admin'::user_role
)
WITH CHECK (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE merchant_id = get_user_merchant_id()
  )
  AND get_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can delete recipe ingredients for their merchant"
ON recipe_ingredients FOR DELETE TO authenticated
USING (
  menu_item_id IN (
    SELECT id FROM menu_items WHERE merchant_id = get_user_merchant_id()
  )
  AND get_user_role() = 'admin'::user_role
);

-- Part 4: Order completion idempotency marker
ALTER TABLE orders
  ADD COLUMN inventory_deducted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN orders.inventory_deducted_at IS
  'Set when recipe inventory deduction ran for this completed order; NULL until deducted.';

-- Part 5: Outbound inventory movements for order deduction
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN ('receipt', 'order_deduction'));

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_quantity_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_quantity_check
  CHECK (
    (movement_type = 'receipt' AND quantity > 0)
    OR (movement_type = 'order_deduction' AND quantity >= 0)
  );

ALTER TABLE inventory_movements
  ADD COLUMN order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_inventory_movements_order
  ON inventory_movements (order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX idx_inventory_movements_order_deduction_unique
  ON inventory_movements (order_id, raw_material_id)
  WHERE movement_type = 'order_deduction' AND order_id IS NOT NULL;

-- Part 6: Atomic order completion + inventory deduction RPC
CREATE OR REPLACE FUNCTION complete_order_and_deduct_inventory(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
  v_role user_role;
  v_order orders%ROWTYPE;
  v_partial BOOLEAN := false;
  v_deductions JSONB := '[]'::jsonb;
  v_rec RECORD;
  v_requested DECIMAL(10, 3);
  v_applied DECIMAL(10, 3);
  v_on_hand DECIMAL(10, 3);
  v_unit_cost DECIMAL(10, 2);
BEGIN
  v_merchant_id := get_user_merchant_id();
  v_role := get_user_role();

  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_role NOT IN ('waiter'::user_role, 'admin'::user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND merchant_id = v_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_order.status = 'completed'::order_status
     AND v_order.inventory_deducted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'partial', false,
      'deductions', '[]'::jsonb
    );
  END IF;

  IF v_order.status <> 'served'::order_status THEN
    RAISE EXCEPTION 'order_not_completable';
  END IF;

  FOR v_rec IN
    SELECT
      ri.raw_material_id,
      SUM(ri.quantity_kg * oi.quantity) AS total_kg
    FROM order_items oi
    INNER JOIN recipe_ingredients ri ON ri.menu_item_id = oi.menu_item_id
    WHERE oi.order_id = p_order_id
    GROUP BY ri.raw_material_id
  LOOP
    v_requested := v_rec.total_kg;

    SELECT quantity_on_hand, unit_cost
    INTO v_on_hand, v_unit_cost
    FROM raw_materials_inventory
    WHERE id = v_rec.raw_material_id
      AND merchant_id = v_merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_applied := LEAST(v_requested, GREATEST(v_on_hand, 0));

    IF v_applied < v_requested THEN
      v_partial := true;
    END IF;

    UPDATE raw_materials_inventory
    SET
      quantity_on_hand = GREATEST(v_on_hand - v_applied, 0),
      last_updated = NOW()
    WHERE id = v_rec.raw_material_id
      AND merchant_id = v_merchant_id;

    IF v_requested > 0 THEN
      INSERT INTO inventory_movements (
        merchant_id,
        raw_material_id,
        movement_type,
        quantity,
        unit_cost,
        recorded_by,
        order_id,
        metadata
      ) VALUES (
        v_merchant_id,
        v_rec.raw_material_id,
        'order_deduction',
        v_applied,
        v_unit_cost,
        auth.uid(),
        p_order_id,
        jsonb_build_object(
          'order_id', p_order_id,
          'requested_kg', v_requested,
          'applied_kg', v_applied,
          'partial_deduction', v_applied < v_requested,
          'reason', CASE
            WHEN v_applied < v_requested THEN 'insufficient_stock'
            ELSE NULL
          END
        )
      );
    END IF;

    v_deductions := v_deductions || jsonb_build_array(
      jsonb_build_object(
        'raw_material_id', v_rec.raw_material_id,
        'requested_kg', v_requested,
        'applied_kg', v_applied
      )
    );
  END LOOP;

  UPDATE orders
  SET
    status = 'completed'::order_status,
    inventory_deducted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'partial', v_partial,
    'deductions', v_deductions
  );
END;
$$;

REVOKE ALL ON FUNCTION complete_order_and_deduct_inventory(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_order_and_deduct_inventory(UUID) TO authenticated;
