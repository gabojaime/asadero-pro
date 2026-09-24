-- Phase 7: fulfillment timing, customer fields, kitchen priority horizon

CREATE TYPE order_fulfillment_timing AS ENUM ('immediate', 'scheduled');

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Caracas',
  ADD COLUMN IF NOT EXISTS kitchen_priority_horizon_minutes INT NOT NULL DEFAULT 45
    CHECK (kitchen_priority_horizon_minutes >= 1 AND kitchen_priority_horizon_minutes <= 480);

COMMENT ON COLUMN merchants.timezone IS 'IANA timezone for scheduled ready-by capture and kitchen HH:mm display.';
COMMENT ON COLUMN merchants.kitchen_priority_horizon_minutes IS 'Scheduled orders within this many minutes of ready_by_at sort with immediate tickets (urgent tier).';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_timing order_fulfillment_timing NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS ready_by_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS customer_first_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS customer_last_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT NULL;

COMMENT ON COLUMN orders.ready_by_at IS 'Customer promised ready/delivery instant (scheduled orders). Not grill ready timestamp — see ready_at.';
COMMENT ON COLUMN orders.fulfillment_timing IS 'immediate = cook now; scheduled = orden posterior with ready_by_at.';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_ready_by_consistency;

ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_ready_by_consistency CHECK (
  (fulfillment_timing = 'immediate' AND ready_by_at IS NULL)
  OR (fulfillment_timing = 'scheduled' AND ready_by_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_orders_ready_by_at ON orders(merchant_id, ready_by_at)
  WHERE status IN ('pending', 'cooking') AND fulfillment_timing = 'scheduled';

DROP FUNCTION IF EXISTS public.create_order_with_items(
  service_type,
  DECIMAL,
  TEXT,
  DECIMAL,
  JSONB
);

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_service_type service_type,
  p_delivery_fee DECIMAL(10, 2),
  p_delivery_zone TEXT,
  p_total_amount DECIMAL(10, 2),
  p_fulfillment_timing order_fulfillment_timing,
  p_ready_by_at TIMESTAMPTZ,
  p_customer_first_name TEXT,
  p_customer_last_name TEXT,
  p_customer_phone TEXT,
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
    fulfillment_timing,
    ready_by_at,
    customer_first_name,
    customer_last_name,
    customer_phone,
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
    p_fulfillment_timing,
    p_ready_by_at,
    NULLIF(trim(p_customer_first_name), ''),
    NULLIF(trim(p_customer_last_name), ''),
    NULLIF(trim(p_customer_phone), ''),
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
  order_fulfillment_timing,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  service_type,
  DECIMAL,
  TEXT,
  DECIMAL,
  order_fulfillment_timing,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
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
    OR NEW.fulfillment_timing IS DISTINCT FROM OLD.fulfillment_timing
    OR NEW.ready_by_at IS DISTINCT FROM OLD.ready_by_at
    OR NEW.customer_first_name IS DISTINCT FROM OLD.customer_first_name
    OR NEW.customer_last_name IS DISTINCT FROM OLD.customer_last_name
    OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
    OR NEW.sent_to_kitchen_at IS DISTINCT FROM OLD.sent_to_kitchen_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'forbidden_order_field_update';
  END IF;

  RETURN NEW;
END;
$$;
