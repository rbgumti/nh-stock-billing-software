-- Drop old restrictive policies and add manager access
-- Salary records: allow admin and manager
DROP POLICY IF EXISTS "Admins can manage salary records" ON public.salary_records;

CREATE POLICY "Admin and manager can view salary records"
ON public.salary_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin and manager can insert salary records"
ON public.salary_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin and manager can update salary records"
ON public.salary_records
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin and manager can delete salary records"
ON public.salary_records
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Attendance records: allow admin and manager
DROP POLICY IF EXISTS "Admins can manage attendance_records" ON public.attendance_records;

CREATE POLICY "Admin and manager can view attendance records"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin and manager can insert attendance records"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin and manager can update attendance records"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin and manager can delete attendance records"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Clean up duplicate/conflicting policies on employees
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;