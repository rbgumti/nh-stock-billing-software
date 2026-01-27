-- Create employees table for salary management
CREATE TABLE public.salary_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  salary_fixed NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salary records table
CREATE TABLE public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.salary_employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM format
  working_days NUMERIC NOT NULL DEFAULT 0,
  advance_adjusted NUMERIC NOT NULL DEFAULT 0,
  advance_pending NUMERIC NOT NULL DEFAULT 0,
  salary_payable NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month)
);

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.salary_employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'leave', 'holiday')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.salary_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for salary_employees
CREATE POLICY "Admins can view salary employees"
  ON public.salary_employees FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can insert salary employees"
  ON public.salary_employees FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update salary employees"
  ON public.salary_employees FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete salary employees"
  ON public.salary_employees FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only policies for salary_records
CREATE POLICY "Admins can view salary records"
  ON public.salary_records FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can insert salary records"
  ON public.salary_records FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update salary records"
  ON public.salary_records FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete salary records"
  ON public.salary_records FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only policies for attendance_records
CREATE POLICY "Admins can view attendance records"
  ON public.attendance_records FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can insert attendance records"
  ON public.attendance_records FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update attendance records"
  ON public.attendance_records FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete attendance records"
  ON public.attendance_records FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_salary_records_employee_month ON public.salary_records(employee_id, month);
CREATE INDEX idx_attendance_records_employee_date ON public.attendance_records(employee_id, date);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);

-- Create updated_at trigger for salary_employees
CREATE TRIGGER update_salary_employees_updated_at
  BEFORE UPDATE ON public.salary_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for salary_records
CREATE TRIGGER update_salary_records_updated_at
  BEFORE UPDATE ON public.salary_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();