-- Add working_days column to salary_records table to allow editable working days
ALTER TABLE public.salary_records 
ADD COLUMN IF NOT EXISTS working_days numeric DEFAULT NULL;

-- Add advance_pending column as well for completeness
ALTER TABLE public.salary_records 
ADD COLUMN IF NOT EXISTS advance_pending numeric DEFAULT 0;