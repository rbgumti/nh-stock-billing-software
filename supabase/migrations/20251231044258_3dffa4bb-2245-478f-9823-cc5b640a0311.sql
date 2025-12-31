-- Add frequency and duration to invoice_items
ALTER TABLE public.invoice_items 
ADD COLUMN frequency TEXT,
ADD COLUMN duration_days INTEGER;

-- Add follow_up_date to invoices
ALTER TABLE public.invoices 
ADD COLUMN follow_up_date DATE;