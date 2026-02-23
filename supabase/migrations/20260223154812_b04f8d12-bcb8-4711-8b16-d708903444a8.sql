
-- Create payment-receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

-- Allow authenticated users to view receipts
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their receipts
CREATE POLICY "Authenticated users can delete receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');
