-- Create appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id integer REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  patient_name text NOT NULL,
  patient_phone text,
  appointment_date timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Scheduled',
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'))
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching the pattern of other tables in this app)
CREATE POLICY "Allow public to view appointments"
ON public.appointments
FOR SELECT
USING (true);

CREATE POLICY "Allow public to insert appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public to update appointments"
ON public.appointments
FOR UPDATE
USING (true);

CREATE POLICY "Allow public to delete appointments"
ON public.appointments
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);