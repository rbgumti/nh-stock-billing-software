-- Create day_reports table to store daily report data
CREATE TABLE public.day_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  
  -- Patient counts
  new_patients integer DEFAULT 0,
  follow_up_patients integer DEFAULT 0,
  
  -- Cash management
  cash_previous_day numeric DEFAULT 0,
  loose_balance numeric DEFAULT 5000,
  deposit_in_bank numeric DEFAULT 0,
  paytm_gpay numeric DEFAULT 0,
  cash_handover_amarjeet numeric DEFAULT 0,
  cash_handover_mandeep numeric DEFAULT 0,
  cash_handover_sir numeric DEFAULT 0,
  adjustments numeric DEFAULT 0,
  
  -- Pharmacy sale
  tapentadol_patients integer DEFAULT 0,
  psychiatry_patients integer DEFAULT 0,
  fees numeric DEFAULT 0,
  lab_collection numeric DEFAULT 0,
  psychiatry_collection numeric DEFAULT 0,
  
  -- Cash denominations (stored as JSON)
  cash_denominations jsonb DEFAULT '[
    {"denomination": 500, "count": 0, "amount": 0},
    {"denomination": 200, "count": 0, "amount": 0},
    {"denomination": 100, "count": 0, "amount": 0},
    {"denomination": 50, "count": 0, "amount": 0},
    {"denomination": 20, "count": 0, "amount": 0},
    {"denomination": 10, "count": 0, "amount": 0},
    {"denomination": 5, "count": 0, "amount": 0},
    {"denomination": 2, "count": 0, "amount": 0},
    {"denomination": 1, "count": 0, "amount": 0}
  ]'::jsonb,
  
  -- Expenses (stored as JSON array)
  expenses jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.day_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view day reports"
ON public.day_reports
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert day reports"
ON public.day_reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update day reports"
ON public.day_reports
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete day reports"
ON public.day_reports
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_day_reports_updated_at
BEFORE UPDATE ON public.day_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();