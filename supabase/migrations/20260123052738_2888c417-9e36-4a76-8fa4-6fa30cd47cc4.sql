-- Add invoice_url column to purchase_orders table for storing uploaded invoice documents
ALTER TABLE public.purchase_orders 
ADD COLUMN invoice_url text;