-- Drop existing restrictive RLS policies for patients table
DROP POLICY IF EXISTS "Authenticated staff can view patients" ON patients;
DROP POLICY IF EXISTS "Authenticated staff can insert patients" ON patients;
DROP POLICY IF EXISTS "Authenticated staff can update patients" ON patients;
DROP POLICY IF EXISTS "Admins can delete patients" ON patients;

-- Create permissive policies allowing public access
CREATE POLICY "Allow public to view patients"
ON patients FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public to insert patients"
ON patients FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public to update patients"
ON patients FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow public to delete patients"
ON patients FOR DELETE
TO public
USING (true);

-- Update RLS policies for stock_items
DROP POLICY IF EXISTS "Authenticated staff can view stock items" ON stock_items;
DROP POLICY IF EXISTS "Authenticated staff can insert stock items" ON stock_items;
DROP POLICY IF EXISTS "Authenticated staff can update stock items" ON stock_items;
DROP POLICY IF EXISTS "Admins can delete stock items" ON stock_items;

CREATE POLICY "Allow public to view stock items"
ON stock_items FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public to insert stock items"
ON stock_items FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public to update stock items"
ON stock_items FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow public to delete stock items"
ON stock_items FOR DELETE
TO public
USING (true);

-- Update RLS policies for purchase_orders
DROP POLICY IF EXISTS "Authenticated staff can view purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated staff can insert purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated staff can update purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Admins can delete purchase orders" ON purchase_orders;

CREATE POLICY "Allow public to view purchase orders"
ON purchase_orders FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public to insert purchase orders"
ON purchase_orders FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public to update purchase orders"
ON purchase_orders FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow public to delete purchase orders"
ON purchase_orders FOR DELETE
TO public
USING (true);

-- Update RLS policies for purchase_order_items
DROP POLICY IF EXISTS "Authenticated staff can view purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Authenticated staff can insert purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Authenticated staff can update purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Admins can delete purchase order items" ON purchase_order_items;

CREATE POLICY "Allow public to view purchase order items"
ON purchase_order_items FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public to insert purchase order items"
ON purchase_order_items FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public to update purchase order items"
ON purchase_order_items FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow public to delete purchase order items"
ON purchase_order_items FOR DELETE
TO public
USING (true);