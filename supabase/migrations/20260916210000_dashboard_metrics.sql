-- Dashboard metrics: merchant settings, session log order link, completion hook

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS monthly_fixed_overhead DECIMAL(12, 2) NULL
    CHECK (monthly_fixed_overhead IS NULL OR monthly_fixed_overhead >= 0),
  ADD COLUMN IF NOT EXISTS seating_table_count INT NULL
    CHECK (seating_table_count IS NULL OR seating_table_count > 0);

ALTER TABLE table_sessions_log
  ADD COLUMN IF NOT EXISTS order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_table_sessions_order_unique
  ON table_sessions_log (order_id)
  WHERE order_id IS NOT NULL;

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
  v_opened_at TIMESTAMPTZ;
  v_closed_at TIMESTAMPTZ;
  v_prep_minutes INT;
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

  v_closed_at := NOW();

  UPDATE orders
  SET
    status = 'completed'::order_status,
    inventory_deducted_at = v_closed_at,
    updated_at = v_closed_at
  WHERE id = p_order_id;

  IF v_order.service_type = 'dine_in'::service_type
     AND v_order.table_number IS NOT NULL THEN
    v_opened_at := COALESCE(v_order.sent_to_kitchen_at, v_order.created_at);
    v_prep_minutes := GREATEST(
      0,
      ROUND(
        EXTRACT(EPOCH FROM (
          COALESCE(v_order.ready_at, v_closed_at) - v_opened_at
        )) / 60.0
      )::INT
    );

    IF NOT EXISTS (
      SELECT 1 FROM table_sessions_log WHERE order_id = p_order_id
    ) THEN
      INSERT INTO table_sessions_log (
        merchant_id,
        table_number,
        opened_at,
        closed_at,
        preparation_time_minutes,
        ticket_total,
        order_id
      ) VALUES (
        v_merchant_id,
        v_order.table_number,
        v_opened_at,
        v_closed_at,
        v_prep_minutes,
        v_order.total_amount,
        p_order_id
      );
    END IF;
  END IF;

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
