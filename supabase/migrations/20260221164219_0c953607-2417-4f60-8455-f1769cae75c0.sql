
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON public.appointments;

-- Create role-restricted policies for appointments
-- Only admin, manager, and reception roles should access appointments

CREATE POLICY "Authorized roles can view appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'reception'::app_role)
);

CREATE POLICY "Authorized roles can insert appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'reception'::app_role)
);

CREATE POLICY "Authorized roles can update appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'reception'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'reception'::app_role)
);

CREATE POLICY "Authorized roles can delete appointments"
ON public.appointments FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'reception'::app_role)
);
