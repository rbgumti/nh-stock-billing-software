INSERT INTO storage.buckets (id, name, public) VALUES ('csv-imports', 'csv-imports', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read csv-imports" ON storage.objects FOR SELECT USING (bucket_id = 'csv-imports');
CREATE POLICY "Auth insert csv-imports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'csv-imports');
