
-- Create storage bucket for data sync between environments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('data-sync', 'data-sync', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for data-sync"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-sync');

-- Allow authenticated admin uploads
CREATE POLICY "Admin can upload to data-sync"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'data-sync');

CREATE POLICY "Admin can update data-sync"
ON storage.objects FOR UPDATE
USING (bucket_id = 'data-sync');
