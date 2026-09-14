# Database schema — asadero-pro

Canonical PostgreSQL schema for the multi-tenant BBQ MVP. Source: `.cursor/rules/01-dabasase.md`.

All table names, columns, indexes, and policies are English. Agents must not change schema via Studio; use migrations (`docs/supabase.md`).

## DDL

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE merchants IS 'BBQ business instances for multi-tenant isolation.';

`address` and `phone` are optional contact fields (nullable). Onboarding persists NULL when omitted or blank.

CREATE TYPE user_role AS ENUM ('admin', 'grill_master', 'waiter');
CREATE TYPE unit_of_measure AS ENUM ('kilogram', 'unit');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    unit_of_measure unit_of_measure NOT NULL,
    quantity_on_hand DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT raw_materials_quantity_non_negative CHECK (quantity_on_hand >= 0)
);

COMMENT ON TABLE raw_materials_inventory IS 'Raw supplies catalog and on-hand stock; kilogram or unit count per item.';

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

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_items IS 'Plates and items available for customers to order.';

**Order kitchen queue extensions** (`20260912160000_order_kitchen_queue.sql`):

```sql
CREATE TYPE menu_item_kind AS ENUM ('meat_plate', 'drink', 'side');

ALTER TABLE menu_items
  ADD COLUMN item_kind menu_item_kind NOT NULL DEFAULT 'meat_plate',
  ADD COLUMN protein_group TEXT NULL CHECK (protein_group IN ('beef', 'pork', 'chicken')),
  ADD COLUMN weight_label TEXT NULL;

CREATE TABLE order_item_sides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  side_menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  UNIQUE (order_item_id, slot)
);

ALTER TABLE orders
  ADD COLUMN sent_to_kitchen_at TIMESTAMPTZ,
  ADD COLUMN ready_at TIMESTAMPTZ,
  ADD COLUMN delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN delivery_zone TEXT NULL,
  ADD CONSTRAINT orders_delivery_fee_non_negative CHECK (delivery_fee >= 0);
```

`orders` is published to `supabase_realtime`. Order RLS is role-aware: waiters/admins INSERT; grillmasters/admins UPDATE status.

**Waste cost calculator extensions** (`20260912180000_waste_cost_calculator.sql`):

```sql
ALTER TABLE merchants
  ADD COLUMN target_food_cost_pct DECIMAL(5, 4) NOT NULL DEFAULT 0.3300;

CREATE TABLE menu_item_costing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  waste_pct DECIMAL(5, 2) NULL CHECK (waste_pct >= 0 AND waste_pct < 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (menu_item_id)
);

ALTER TABLE orders
  ADD COLUMN inventory_deducted_at TIMESTAMPTZ NULL;

ALTER TABLE inventory_movements
  ADD COLUMN order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- movement_type: receipt | order_deduction
-- RPC: complete_order_and_deduct_inventory(order_id)
```

Admin-only RLS on `menu_item_costing`; `recipe_ingredients` writes admin-only (tenant read for all roles). Order completion deduction uses SECURITY DEFINER RPC (waiter/admin).

**Review fixes** (`20260912170000_order_kitchen_review_fixes.sql`):

- `create_order_with_items(...)` RPC — atomic insert of order + items + sides in one transaction
- `orders_enforce_kitchen_update_columns` trigger — grill_master/admin UPDATE limited to `status`, `ready_at`, `updated_at`

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
```

`users.id` is expected to match `auth.uid()` (Supabase Auth user id).

## Indexes

```sql
CREATE INDEX idx_users_merchant ON users(merchant_id);
CREATE INDEX idx_inventory_merchant ON raw_materials_inventory(merchant_id);
CREATE INDEX idx_inventory_movements_lookup ON inventory_movements(merchant_id, raw_material_id, created_at DESC);
CREATE INDEX idx_menu_items_merchant ON menu_items(merchant_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_waste_merchant ON waste_logs(merchant_id);
CREATE INDEX idx_sessions_merchant ON table_sessions_log(merchant_id);

CREATE INDEX idx_orders_status ON orders(merchant_id, status);
CREATE INDEX idx_orders_created_at ON orders(merchant_id, created_at);
CREATE INDEX idx_waste_created_at ON waste_logs(merchant_id, created_at);
CREATE INDEX idx_sessions_closed_at ON table_sessions_log(merchant_id, closed_at);
```

## Row Level Security

Enable RLS on all operational tables. Tenant isolation uses `get_user_merchant_id()`, **not** `auth.uid() = merchants.id`.

```sql
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_merchant_id()
RETURNS UUID AS $$
    SELECT merchant_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Users can read their merchant"
ON merchants FOR SELECT TO authenticated
USING (id = get_user_merchant_id());

CREATE POLICY "Users can read staff of their merchant"
ON users FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can only read inventory of their merchant"
ON raw_materials_inventory FOR SELECT TO authenticated
USING (merchant_id = get_user_merchant_id());

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
```

Role-specific mutation rules (who may write inventory vs waste vs orders) must be refined in a spec; the policies above are the minimum tenant fence from the original rule file, plus the tables that were missing policies.

## Domain mapping

| Table column | Domain field |
|--------------|--------------|
| `quantity_on_hand` | `quantityOnHand` |
| `unit_of_measure` | `unitOfMeasure` |
| `unit_cost` | `unitCost` |
| `is_active` | `isActive` |
| `merchant_id` | `merchantId` |
| `last_updated` | `updatedAt` |
| `weight_kg` | `weightKg` |
| `quantity_kg` | `quantityKg` |

Do not add `safety_stock_kg` or `stock_transactions_log` unless a spec and migration introduce them.

## Onboarding RPC

Bootstrap path for the first merchant admin (see `specs/merchant-onboarding/design.md`):

```sql
CREATE OR REPLACE FUNCTION public.create_merchant_and_admin_profile(
  p_merchant_name text,
  p_full_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS uuid
-- SECURITY DEFINER; GRANT EXECUTE TO authenticated only
```

Callable by authenticated users without a `public.users` row. Creates one `merchants` row and one `users` row bound to `auth.uid()`.

## Staff user RPC

Admin-only path for adding staff to an existing merchant (see `specs/multi-tenant-auth/`):

```sql
CREATE OR REPLACE FUNCTION public.create_staff_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role user_role
)
RETURNS uuid
-- SECURITY DEFINER; SET search_path = public; GRANT EXECUTE TO authenticated only
```

Callable only by an authenticated user with `role = 'admin'`. Resolves `merchant_id` from the caller's `public.users` row (never from client params). Requires an existing `auth.users` row for `p_user_id` and rejects duplicate `public.users` profiles. Used after the server creates the auth user via the service role; the RPC binds the profile to the admin's tenant.
