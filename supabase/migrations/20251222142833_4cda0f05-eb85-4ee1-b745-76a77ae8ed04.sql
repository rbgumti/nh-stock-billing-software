-- Add GRN number, invoice number, and invoice date columns to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS grn_number text,
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS invoice_date text;