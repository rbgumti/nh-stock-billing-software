
CREATE TABLE IF NOT EXISTS public.onedrive_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name text NOT NULL DEFAULT 'Sheet1',
  row_number int NOT NULL,
  position int NOT NULL,
  value numeric NOT NULL,
  medicine_name text,
  invoice_id uuid,
  invoice_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sheet_name, row_number, position)
);

ALTER TABLE public.onedrive_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage onedrive_sync_log"
ON public.onedrive_sync_log
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_onedrive_sync_log_lookup
ON public.onedrive_sync_log (sheet_name, row_number, position);
