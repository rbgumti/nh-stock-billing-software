-- Add advances column to day_reports table for tracking employee salary advances
ALTER TABLE public.day_reports
ADD COLUMN advances jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.day_reports.advances IS 'JSON array of employee advances: [{employeeId, employeeName, amount}]';