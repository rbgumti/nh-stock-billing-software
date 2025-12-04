-- Add appointment_id to prescriptions table to link appointments with prescriptions
ALTER TABLE public.prescriptions 
ADD COLUMN appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_prescriptions_appointment_id ON public.prescriptions(appointment_id);