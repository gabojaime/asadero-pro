# Database Schema & Security Specification (db-schema.md)

This file specifies the PostgreSQL schema and security policies for the multi-tenant BBQ management system. All tables, columns, constraints, and Row Level Security (RLS) policies are written in English.

---

## 1. POSTGRESQL DDL (SUPABASE SCHEMA)

```sql
-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MERCHANTS (Multi-Tenant Core)
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE merchants IS 'BBQ business instances for multi-tenant isolation.';

-- 2. USERS (Staff and Roles)
CREATE TYPE user_role AS ENUM ('admin', 'grill_master', 'waiter');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'waiter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Staff members authorized to log in and register orders.';

-- 3. RAW MATERIALS INVENTORY (Stock in Kilograms)
CREATE TABLE raw_materials_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'raw_arrachera', 'raw_pork_ribs', 'raw_chicken_breast', 'charcoal'
    sku VARCHAR(50),
    stock_kg DECIMAL(10, 3) NOT NULL DEFAULT 0.000, -- 3 decimals for exact grams
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- cost per kilogram
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE raw_materials_inventory IS 'Stock of raw meat and supplies tracked in kilograms.';

-- 4. MENU ITEMS (Ready-for-sale dishes)
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., 'Arrachera Plate 300g', 'Family BBQ Combo'
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_items IS 'Plates and items available for customers to order.';

-- 5. RECIPE INGREDIENTS (Deduction Mapping)
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials_inventory(id) ON DELETE CASCADE,
    quantity_kg DECIMAL(10, 3) NOT NULL, -- e.g., 0.300 kg of raw meat per portion
    UNIQUE(menu_item_id, raw_material_id)
);

COMMENT ON TABLE recipe_ingredients IS 'Maps menu plates to raw materials to trigger automatic inventory deduction.';

-- 6. ORDERS (Table commands)
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

-- 7. ORDER ITEMS (Order detail)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

COMMENT ON TABLE order_items IS 'Individual plates selected inside an order.';

-- 8. WASTE LOGS (Losses from grilling or trimming)
CREATE TYPE waste_reason AS ENUM ('burned_on_grill', 'fat_discarded', 'spoiled_raw', 'customer_return');

CREATE TABLE waste_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials_inventory(id) ON DELETE SET NULL,
    weight_kg DECIMAL(10, 3) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL, -- captured unit cost at the time of waste
    total_cost DECIMAL(10, 2) NOT NULL, -- weight_kg * unit_cost
    reason waste_reason NOT NULL,
    logged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE waste_logs IS 'Tracks raw or cooked meat loss to compute the Waste % metric.';

-- 9. TABLE SESSIONS LOG (Operational KPIs)
CREATE TABLE table_sessions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    preparation_time_minutes INT NOT NULL, -- minutes from order creation to served
    ticket_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE table_sessions_log IS 'Logs completed table sessions to feed occupancy and turnover metrics.';
```

---

## 2. INDEX OPTIMIZATION

Create standard indexes to speed up the calculations on the metrics dashboard:

```sql
-- Indexes for faster multi-tenant query resolution
CREATE INDEX idx_users_merchant ON users(merchant_id);
CREATE INDEX idx_inventory_merchant ON raw_materials_inventory(merchant_id);
CREATE INDEX idx_menu_items_merchant ON menu_items(merchant_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_waste_merchant ON waste_logs(merchant_id);
CREATE INDEX idx_sessions_merchant ON table_sessions_log(merchant_id);

-- Operational lookup indexes
CREATE INDEX idx_orders_status ON orders(merchant_id, status);
CREATE INDEX idx_orders_created_at ON orders(merchant_id, created_at);
CREATE INDEX idx_waste_created_at ON waste_logs(merchant_id, created_at);
CREATE INDEX idx_sessions_closed_at ON table_sessions_log(merchant_id, closed_at);
```

---

## 3. ROW LEVEL SECURITY (RLS) POLICIES

To prevent tenant data leaks, enable PostgreSQL Row Level Security on all operational tables. The policies below assume the application injects the authenticated `auth.uid()` which maps to the user's `merchant_id`.

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions_log ENABLE ROW LEVEL SECURITY;

-- Helper function to extract current user's merchant_id (cached in user's JWT metadata)
CREATE OR REPLACE FUNCTION get_user_merchant_id() 
RETURNS UUID AS $$
    SELECT merchant_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Define Policies for Raw Materials Inventory
CREATE POLICY "Users can only read inventory of their merchant" 
ON raw_materials_inventory FOR SELECT 
TO authenticated 
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Admins and Grill Masters can modify inventory" 
ON raw_materials_inventory FOR ALL 
TO authenticated 
USING (merchant_id = get_user_merchant_id())
WITH CHECK (merchant_id = get_user_merchant_id());

-- Define Policies for Orders and Items
CREATE POLICY "Users can manage orders of their merchant" 
ON orders FOR ALL 
TO authenticated 
USING (merchant_id = get_user_merchant_id())
WITH CHECK (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can manage order items" 
ON order_items FOR ALL 
TO authenticated 
USING (
    order_id IN (
        SELECT id FROM orders WHERE merchant_id = get_user_merchant_id()
    )
);

-- Define Policies for Waste Logs
CREATE POLICY "Users can read waste logs of their merchant" 
ON waste_logs FOR SELECT 
TO authenticated 
USING (merchant_id = get_user_merchant_id());

CREATE POLICY "Users can insert waste logs of their merchant" 
ON waste_logs FOR INSERT 
TO authenticated 
WITH CHECK (merchant_id = get_user_merchant_id());
```
