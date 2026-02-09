-- Drop the unique constraint on patient_id to allow duplicate file numbers
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_patient_id_key;
