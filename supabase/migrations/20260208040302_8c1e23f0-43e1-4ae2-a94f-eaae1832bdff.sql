-- Reload PostgREST schema cache so newly-added columns are recognized
SELECT pg_notify('pgrst', 'reload schema');
