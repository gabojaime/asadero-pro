-- Operational waste logging: waste_log movements, RPC, RLS tightening

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN ('receipt', 'order_deduction', 'waste_log'));

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_quantity_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_quantity_check
  CHECK (
    (movement_type = 'receipt' AND quantity > 0)
    OR (movement_type = 'order_deduction' AND quantity >= 0)
    OR (movement_type = 'waste_log' AND quantity > 0)
  );

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS waste_log_id UUID NULL
    REFERENCES waste_logs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_waste_log_unique
  ON inventory_movements (waste_log_id)
  WHERE movement_type = 'waste_log' AND waste_log_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert waste logs of their merchant" ON waste_logs;

CREATE POLICY "Staff can insert waste logs for their merchant"
ON waste_logs FOR INSERT TO authenticated
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() IN ('admin'::user_role, 'grill_master'::user_role)
);

CREATE OR REPLACE FUNCTION log_operational_waste(
  p_raw_material_id UUID,
  p_weight_kg DECIMAL(10, 3),
  p_reason waste_reason
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
  v_role user_role;
  v_user_id UUID;
  v_material raw_materials_inventory%ROWTYPE;
  v_unit_cost DECIMAL(10, 2);
  v_on_hand DECIMAL(10, 3);
  v_total_cost DECIMAL(10, 2);
  v_applied DECIMAL(10, 3);
  v_partial BOOLEAN;
  v_waste_log_id UUID;
  v_movement_total DECIMAL(10, 2);
BEGIN
  v_merchant_id := get_user_merchant_id();
  v_role := get_user_role();
  v_user_id := auth.uid();

  IF v_merchant_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_role NOT IN ('admin'::user_role, 'grill_master'::user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_weight_kg IS NULL OR p_weight_kg <= 0 THEN
    RAISE EXCEPTION 'validation_failed';
  END IF;

  SELECT *
  INTO v_material
  FROM raw_materials_inventory
  WHERE id = p_raw_material_id
    AND merchant_id = v_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_material.is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_material.unit_of_measure IS DISTINCT FROM 'kilogram'::unit_of_measure THEN
    RAISE EXCEPTION 'validation_failed';
  END IF;

  v_unit_cost := v_material.unit_cost;
  v_on_hand := v_material.quantity_on_hand;
  v_total_cost := ROUND(p_weight_kg * v_unit_cost, 2);

  INSERT INTO waste_logs (
    merchant_id,
    raw_material_id,
    weight_kg,
    unit_cost,
    total_cost,
    reason,
    logged_by
  ) VALUES (
    v_merchant_id,
    p_raw_material_id,
    p_weight_kg,
    v_unit_cost,
    v_total_cost,
    p_reason,
    v_user_id
  )
  RETURNING id INTO v_waste_log_id;

  v_applied := LEAST(p_weight_kg, GREATEST(v_on_hand, 0));
  v_partial := v_applied < p_weight_kg;

  IF v_applied > 0 THEN
    UPDATE raw_materials_inventory
    SET
      quantity_on_hand = GREATEST(v_on_hand - v_applied, 0),
      last_updated = NOW()
    WHERE id = p_raw_material_id
      AND merchant_id = v_merchant_id;

    v_movement_total := ROUND(v_applied * v_unit_cost, 2);

    INSERT INTO inventory_movements (
      merchant_id,
      raw_material_id,
      movement_type,
      quantity,
      unit_cost,
      recorded_by,
      waste_log_id,
      metadata
    ) VALUES (
      v_merchant_id,
      p_raw_material_id,
      'waste_log',
      v_applied,
      v_unit_cost,
      v_user_id,
      v_waste_log_id,
      jsonb_build_object(
        'waste_log_id', v_waste_log_id,
        'requested_kg', p_weight_kg,
        'applied_kg', v_applied,
        'partial_stock', v_partial,
        'total_cost', v_movement_total,
        'reason', p_reason::text
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'waste_log_id', v_waste_log_id,
    'partial', v_partial,
    'applied_kg', v_applied,
    'requested_kg', p_weight_kg
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_operational_waste(UUID, DECIMAL, waste_reason) TO authenticated;
