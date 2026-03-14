ALTER TABLE public.purchase_order_items ALTER COLUMN unit_price TYPE numeric(10,5);
ALTER TABLE public.purchase_order_items ALTER COLUMN mrp TYPE numeric(10,5);
ALTER TABLE public.purchase_order_items ALTER COLUMN total TYPE numeric(12,5);
ALTER TABLE public.purchase_order_items ALTER COLUMN total_price TYPE numeric(12,5);
ALTER TABLE public.invoice_items ALTER COLUMN unit_price TYPE numeric(10,5);
ALTER TABLE public.invoice_items ALTER COLUMN mrp TYPE numeric(10,5);
ALTER TABLE public.invoice_items ALTER COLUMN total TYPE numeric(12,5);