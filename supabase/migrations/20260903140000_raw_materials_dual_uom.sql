-- Raw materials dual UoM: kilogram | unit, inventory movements, admin-only writes

CREATE TYPE unit_of_measure AS ENUM ('kilogram', 'unit');

ALTER TABLE raw_materials_inventory
  ADD COLUMN unit_of_measure unit_of_measure;

UPDATE raw_materials_inventory
SET unit_of_measure = 'kilogram'
WHERE unit_of_measure IS NULL;

ALTER TABLE raw_materials_inventory
  ALTER COLUMN unit_of_measure SET NOT NULL;

ALTER TABLE raw_materials_inventory
  RENAME COLUMN stock_kg TO quantity_on_hand;

ALTER TABLE raw_materials_inventory
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON TABLE raw_materials_inventory IS 'Raw supplies catalog and on-hand stock; kilogram or unit count per item.';

ALTER TABLE raw_materials_inventory
  ADD CONSTRAINT raw_materials_quantity_non_negative
  CHECK (quantity_on_hand >= 0);

CREATE UNIQUE INDEX idx_raw_materials_merchant_name_active
  ON raw_materials_inventory (merchant_id, lower(trim(name)))
  WHERE is_active = true;

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials_inventory(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type = 'receipt'),
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory_movements IS 'Audit log of inventory inward receipts; outbound types added in future specs.';

CREATE INDEX idx_inventory_movements_lookup
  ON inventory_movements (merchant_id, raw_material_id, created_at DESC);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "Admins and Grill Masters can modify inventory" ON raw_materials_inventory;

CREATE POLICY "Admins can insert inventory for their merchant"
ON raw_materials_inventory FOR INSERT TO authenticated
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
);

CREATE POLICY "Admins can update inventory for their merchant"
ON raw_materials_inventory FOR UPDATE TO authenticated
USING (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
)
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
);

CREATE POLICY "Admins can delete inventory for their merchant"
ON raw_materials_inventory FOR DELETE TO authenticated
USING (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
);

CREATE POLICY "Users can read inventory movements of their merchant"
ON inventory_movements FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Admins can insert inventory movements for their merchant"
ON inventory_movements FOR INSERT TO authenticated
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
);

CREATE OR REPLACE FUNCTION apply_inventory_receipt(
  p_raw_material_id UUID,
  p_quantity_on_hand DECIMAL(10, 3),
  p_unit_cost DECIMAL(10, 2),
  p_movement_quantity DECIMAL(10, 3),
  p_movement_unit_cost DECIMAL(10, 2)
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
BEGIN
  v_merchant_id := get_user_merchant_id();

  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF get_user_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE raw_materials_inventory
  SET
    quantity_on_hand = p_quantity_on_hand,
    unit_cost = p_unit_cost,
    last_updated = NOW()
  WHERE id = p_raw_material_id
    AND merchant_id = v_merchant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  INSERT INTO inventory_movements (
    merchant_id,
    raw_material_id,
    movement_type,
    quantity,
    unit_cost,
    recorded_by
  ) VALUES (
    v_merchant_id,
    p_raw_material_id,
    'receipt',
    p_movement_quantity,
    p_movement_unit_cost,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION apply_inventory_receipt(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_inventory_receipt(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
