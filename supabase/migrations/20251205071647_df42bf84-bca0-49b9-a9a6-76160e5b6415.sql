-- Add category column to patients table
ALTER TABLE public.patients 
ADD COLUMN category text DEFAULT NULL;

-- Add a comment to document the allowed values
COMMENT ON COLUMN public.patients.category IS 'Patient category: BNX, TPN, PSHY, BNX + PSHY, TPN + PSHY';