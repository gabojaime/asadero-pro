-- Review fixes: atomic order insert RPC + restrict kitchen UPDATE columns

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_service_type service_type,
  p_delivery_fee DECIMAL(10, 2),
  p_delivery_zone TEXT,
  p_total_amount DECIMAL(10, 2),
  p_lines JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
  v_order_id UUID;
  v_line JSONB;
  v_order_item_id UUID;
  v_side JSONB;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_merchant_id := get_user_merchant_id();

  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF get_user_role() NOT IN ('waiter', 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'invalid_lines';
  END IF;

  INSERT INTO orders (
    merchant_id,
    server_id,
    service_type,
    status,
    table_number,
    total_amount,
    delivery_fee,
    delivery_zone,
    sent_to_kitchen_at,
    updated_at
  ) VALUES (
    v_merchant_id,
    auth.uid(),
    p_service_type,
    'pending',
    NULL,
    p_total_amount,
    p_delivery_fee,
    NULLIF(trim(p_delivery_zone), ''),
    v_now,
    v_now
  )
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO order_items (
      order_id,
      menu_item_id,
      quantity,
      unit_price,
      subtotal
    ) VALUES (
      v_order_id,
      (v_line->>'menu_item_id')::UUID,
      (v_line->>'quantity')::INT,
      (v_line->>'unit_price')::DECIMAL(10, 2),
      (v_line->>'subtotal')::DECIMAL(10, 2)
    )
    RETURNING id INTO v_order_item_id;

    IF v_line ? 'sides' AND jsonb_typeof(v_line->'sides') = 'array' THEN
      FOR v_side IN SELECT value FROM jsonb_array_elements(v_line->'sides')
      LOOP
        INSERT INTO order_item_sides (
          order_item_id,
          side_menu_item_id,
          slot
        ) VALUES (
          v_order_item_id,
          (v_side->>'side_menu_item_id')::UUID,
          (v_side->>'slot')::SMALLINT
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items(
  service_type,
  DECIMAL,
  TEXT,
  DECIMAL,
  JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  service_type,
  DECIMAL,
  TEXT,
  DECIMAL,
  JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.orders_enforce_kitchen_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF get_user_role() NOT IN ('grill_master', 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.merchant_id IS DISTINCT FROM OLD.merchant_id
    OR NEW.server_id IS DISTINCT FROM OLD.server_id
    OR NEW.table_number IS DISTINCT FROM OLD.table_number
    OR NEW.service_type IS DISTINCT FROM OLD.service_type
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
    OR NEW.delivery_zone IS DISTINCT FROM OLD.delivery_zone
    OR NEW.sent_to_kitchen_at IS DISTINCT FROM OLD.sent_to_kitchen_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'forbidden_order_field_update';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enforce_kitchen_update_columns ON orders;

CREATE TRIGGER orders_enforce_kitchen_update_columns
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_enforce_kitchen_update_columns();
