-- Phase 1: Create Role-Based Access Control System

-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

-- Create user_roles table to manage user permissions
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 2: Secure the patients table

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Allow all access to patients" ON public.patients;

-- Only authenticated staff and admins can view patient records
CREATE POLICY "Authenticated staff can view patients"
ON public.patients
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Only authenticated staff and admins can insert patient records
CREATE POLICY "Authenticated staff can insert patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Only authenticated staff and admins can update patient records
CREATE POLICY "Authenticated staff can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Only admins can delete patient records
CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 3: Secure purchase_orders table

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all access to purchase_orders" ON public.purchase_orders;

-- Authenticated staff and admins can view purchase orders
CREATE POLICY "Authenticated staff can view purchase orders"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Authenticated staff and admins can insert purchase orders
CREATE POLICY "Authenticated staff can insert purchase orders"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Authenticated staff and admins can update purchase orders
CREATE POLICY "Authenticated staff can update purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Only admins can delete purchase orders
CREATE POLICY "Admins can delete purchase orders"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 4: Secure purchase_order_items table

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all access to purchase_order_items" ON public.purchase_order_items;

-- Authenticated staff and admins can view purchase order items
CREATE POLICY "Authenticated staff can view purchase order items"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Authenticated staff and admins can insert purchase order items
CREATE POLICY "Authenticated staff can insert purchase order items"
ON public.purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Authenticated staff and admins can update purchase order items
CREATE POLICY "Authenticated staff can update purchase order items"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Only admins can delete purchase order items
CREATE POLICY "Admins can delete purchase order items"
ON public.purchase_order_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 5: Secure stock_items table

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all access to stock_items" ON public.stock_items;

-- Authenticated staff and admins can view stock items
CREATE POLICY "Authenticated staff can view stock items"
ON public.stock_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Authenticated staff and admins can insert stock items
CREATE POLICY "Authenticated staff can insert stock items"
ON public.stock_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Authenticated staff and admins can update stock items
CREATE POLICY "Authenticated staff can update stock items"
ON public.stock_items
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Only admins can delete stock items
CREATE POLICY "Admins can delete stock items"
ON public.stock_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 6: Fix existing function security issue
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers that use this function
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at
BEFORE UPDATE ON public.stock_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();