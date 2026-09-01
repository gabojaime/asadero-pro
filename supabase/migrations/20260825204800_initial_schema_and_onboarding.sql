CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE merchants IS 'BBQ business instances for multi-tenant isolation.';

ALTER TABLE public.merchants
  ADD COLUMN address VARCHAR(255),
  ADD COLUMN phone VARCHAR(255);

CREATE TYPE user_role AS ENUM ('admin', 'grill_master', 'waiter');

CREATE TABLE users (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'waiter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Staff members authorized to log in and register orders.';

CREATE TABLE raw_materials_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50),
    stock_kg DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE raw_materials_inventory IS 'Stock of raw meat and supplies tracked in kilograms.';

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_items IS 'Plates and items available for customers to order.';

CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials_inventory(id) ON DELETE CASCADE,
    quantity_kg DECIMAL(10, 3) NOT NULL,
    UNIQUE(menu_item_id, raw_material_id)
);

COMMENT ON TABLE recipe_ingredients IS 'Maps menu plates to raw materials to trigger automatic inventory deduction.';

CREATE TYPE order_status AS ENUM ('pending', 'cooking', 'served', 'completed', 'cancelled');
CREATE TYPE service_type AS ENUM ('dine_in', 'take_out', 'delivery');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    server_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_number INT,
    service_type service_type NOT NULL DEFAULT 'dine_in',
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Primary transactions representing customer tables and checkout.';

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

COMMENT ON TABLE order_items IS 'Individual plates selected inside an order.';

CREATE TYPE waste_reason AS ENUM ('burned_on_grill', 'fat_discarded', 'spoiled_raw', 'customer_return');

CREATE TABLE waste_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials_inventory(id) ON DELETE SET NULL,
    weight_kg DECIMAL(10, 3) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    reason waste_reason NOT NULL,
    logged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE waste_logs IS 'Tracks raw or cooked meat loss to compute the Waste % metric.';

CREATE TABLE table_sessions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    preparation_time_minutes INT NOT NULL,
    ticket_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE table_sessions_log IS 'Logs completed table sessions to feed occupancy and turnover metrics.';

CREATE INDEX idx_users_merchant ON users(merchant_id);
CREATE INDEX idx_inventory_merchant ON raw_materials_inventory(merchant_id);
CREATE INDEX idx_menu_items_merchant ON menu_items(merchant_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_waste_merchant ON waste_logs(merchant_id);
CREATE INDEX idx_sessions_merchant ON table_sessions_log(merchant_id);

CREATE INDEX idx_orders_status ON orders(merchant_id, status);
CREATE INDEX idx_orders_created_at ON orders(merchant_id, created_at);
CREATE INDEX idx_waste_created_at ON waste_logs(merchant_id, created_at);
CREATE INDEX idx_sessions_closed_at ON table_sessions_log(merchant_id, closed_at);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_merchant_id()
RETURNS UUID AS $$
    SELECT merchant_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users can read their merchant"
ON merchants FOR SELECT TO authenticated
USING (id = get_user_merchant_id());

CREATE POLICY "Users can read staff of their merchant"
ON users FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can only read inventory of their merchant"
ON raw_materials_inventory FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Admins and Grill Masters can modify inventory"
ON raw_materials_inventory FOR ALL TO authenticated
USING (merchant_id = get_user_merchant_id())
WITH CHECK (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can read menu items of their merchant"
ON menu_items FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can manage recipe ingredients of their merchant"
ON recipe_ingredients FOR ALL TO authenticated
USING (
    menu_item_id IN (
        SELECT id FROM menu_items WHERE merchant_id = get_user_merchant_id()
    )
);

CREATE POLICY "Users can manage orders of their merchant"
ON orders FOR ALL TO authenticated
USING (merchant_id = get_user_merchant_id())
WITH CHECK (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can manage order items"
ON order_items FOR ALL TO authenticated
USING (
    order_id IN (
        SELECT id FROM orders WHERE merchant_id = get_user_merchant_id()
    )
);

CREATE POLICY "Users can read waste logs of their merchant"
ON waste_logs FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can insert waste logs of their merchant"
ON waste_logs FOR INSERT TO authenticated
WITH CHECK (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can manage table sessions of their merchant"
ON table_sessions_log FOR ALL TO authenticated
USING (merchant_id = get_user_merchant_id())
WITH CHECK (merchant_id = get_user_merchant_id());

CREATE OR REPLACE FUNCTION public.create_merchant_and_admin_profile(
  p_merchant_name text,
  p_full_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_merchant_id uuid;
  v_email text;
  v_address text;
  v_phone text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'already_onboarded';
  END IF;

  IF trim(p_merchant_name) = '' OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  v_address := NULLIF(trim(COALESCE(p_address, '')), '');
  v_phone := NULLIF(trim(COALESCE(p_phone, '')), '');

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.merchants (name, address, phone)
  VALUES (trim(p_merchant_name), v_address, v_phone)
  RETURNING id INTO v_merchant_id;

  INSERT INTO public.users (id, merchant_id, email, full_name, role)
  VALUES (v_user_id, v_merchant_id, v_email, trim(p_full_name), 'admin');

  RETURN v_merchant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_merchant_and_admin_profile(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_merchant_and_admin_profile(text, text, text, text) TO authenticated;
