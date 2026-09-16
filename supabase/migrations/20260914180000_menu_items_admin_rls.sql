-- Menu items admin write policies, price CHECK, and partial unique active name per merchant.

ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_price_non_negative
  CHECK (price >= 0);

CREATE UNIQUE INDEX idx_menu_items_merchant_name_active
  ON menu_items (merchant_id, lower(trim(name)))
  WHERE is_active = true;

CREATE POLICY "Admins can insert menu items for their merchant"
ON menu_items FOR INSERT TO authenticated
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
);

CREATE POLICY "Admins can update menu items for their merchant"
ON menu_items FOR UPDATE TO authenticated
USING (merchant_id = get_user_merchant_id())
WITH CHECK (
  merchant_id = get_user_merchant_id()
  AND get_user_role() = 'admin'
);
