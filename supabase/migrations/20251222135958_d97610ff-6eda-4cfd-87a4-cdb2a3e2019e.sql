-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily snapshot at 00:01 IST (which is 18:31 UTC previous day)
-- This will run the existing snapshot_opening_at_1am_ist function daily
SELECT cron.schedule(
  'daily-opening-stock-snapshot',
  '31 18 * * *',  -- 18:31 UTC = 00:01 IST next day
  $$ SELECT public.snapshot_opening_at_1am_ist(); $$
);