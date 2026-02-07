-- Force PostgREST schema reload using pg_notify function
SELECT pg_notify('pgrst', 'reload schema');