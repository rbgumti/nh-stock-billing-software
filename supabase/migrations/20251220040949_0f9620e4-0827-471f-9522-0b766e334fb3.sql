-- Add additional payment detail fields to supplier_payments table
ALTER TABLE public.supplier_payments
ADD COLUMN utr_number text,
ADD COLUMN bank_reference text,
ADD COLUMN receipt_url text;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true);

-- RLS policies for payment-receipts bucket
CREATE POLICY "Authenticated users can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update payment receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete payment receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);