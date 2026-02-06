-- Reload API schema cache so newly added/changed columns are recognized
NOTIFY pgrst, 'reload schema';
