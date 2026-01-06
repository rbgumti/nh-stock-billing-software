-- Add pack_size, qty_in_strips, qty_in_tabs columns to purchase_order_items table
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS pack_size TEXT,
ADD COLUMN IF NOT EXISTS qty_in_strips INTEGER,
ADD COLUMN IF NOT EXISTS qty_in_tabs INTEGER;