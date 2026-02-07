-- Reload PostgREST schema cache to recognize the first_name column
NOTIFY pgrst, 'reload schema';