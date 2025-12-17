-- Add packing field to stock_items table
ALTER TABLE public.stock_items 
ADD COLUMN packing text;