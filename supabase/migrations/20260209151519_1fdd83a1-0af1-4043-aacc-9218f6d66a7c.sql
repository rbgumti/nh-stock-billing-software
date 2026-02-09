-- Create a temporary storage bucket for CSV imports
INSERT INTO storage.buckets (id, name, public) VALUES ('imports', 'imports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for imports"
ON storage.objects FOR SELECT
USING (bucket_id = 'imports');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload imports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imports');
