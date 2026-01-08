-- Add po_type column to purchase_orders table
ALTER TABLE public.purchase_orders 
ADD COLUMN po_type text NOT NULL DEFAULT 'Stock';

-- Add constraint to ensure valid values
ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_po_type_check 
CHECK (po_type IN ('Stock', 'Service'));

-- Add service-specific fields
ALTER TABLE public.purchase_orders 
ADD COLUMN service_description text,
ADD COLUMN service_amount numeric;