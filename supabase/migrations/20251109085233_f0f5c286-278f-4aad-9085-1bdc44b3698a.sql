-- Fix overly permissive RLS policies to require authentication
-- This replaces public access with authenticated-only access

-- Patients table
DROP POLICY IF EXISTS "Allow public to view patients" ON patients;
DROP POLICY IF EXISTS "Allow public to insert patients" ON patients;
DROP POLICY IF EXISTS "Allow public to update patients" ON patients;
DROP POLICY IF EXISTS "Allow public to delete patients" ON patients;

CREATE POLICY "Authenticated users can view patients" 
ON patients FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert patients" 
ON patients FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update patients" 
ON patients FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete patients" 
ON patients FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Appointments table
DROP POLICY IF EXISTS "Allow public to view appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public to insert appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public to update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public to delete appointments" ON appointments;

CREATE POLICY "Authenticated users can view appointments" 
ON appointments FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert appointments" 
ON appointments FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update appointments" 
ON appointments FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete appointments" 
ON appointments FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Invoices table
DROP POLICY IF EXISTS "Allow public to view invoices" ON invoices;
DROP POLICY IF EXISTS "Allow public to insert invoices" ON invoices;
DROP POLICY IF EXISTS "Allow public to update invoices" ON invoices;
DROP POLICY IF EXISTS "Allow public to delete invoices" ON invoices;

CREATE POLICY "Authenticated users can view invoices" 
ON invoices FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert invoices" 
ON invoices FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoices" 
ON invoices FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invoices" 
ON invoices FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Invoice items table
DROP POLICY IF EXISTS "Allow public to view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Allow public to insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Allow public to update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Allow public to delete invoice items" ON invoice_items;

CREATE POLICY "Authenticated users can view invoice items" 
ON invoice_items FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert invoice items" 
ON invoice_items FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoice items" 
ON invoice_items FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invoice items" 
ON invoice_items FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Stock items table
DROP POLICY IF EXISTS "Allow public to view stock items" ON stock_items;
DROP POLICY IF EXISTS "Allow public to insert stock items" ON stock_items;
DROP POLICY IF EXISTS "Allow public to update stock items" ON stock_items;
DROP POLICY IF EXISTS "Allow public to delete stock items" ON stock_items;

CREATE POLICY "Authenticated users can view stock items" 
ON stock_items FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock items" 
ON stock_items FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock items" 
ON stock_items FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock items" 
ON stock_items FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Purchase orders table
DROP POLICY IF EXISTS "Allow public to view purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Allow public to insert purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Allow public to update purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Allow public to delete purchase orders" ON purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders" 
ON purchase_orders FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert purchase orders" 
ON purchase_orders FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update purchase orders" 
ON purchase_orders FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete purchase orders" 
ON purchase_orders FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Purchase order items table
DROP POLICY IF EXISTS "Allow public to view purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow public to insert purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow public to update purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow public to delete purchase order items" ON purchase_order_items;

CREATE POLICY "Authenticated users can view purchase order items" 
ON purchase_order_items FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert purchase order items" 
ON purchase_order_items FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update purchase order items" 
ON purchase_order_items FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete purchase order items" 
ON purchase_order_items FOR DELETE 
USING (auth.uid() IS NOT NULL);