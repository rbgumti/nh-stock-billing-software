-- Add RLS policies for employees table
-- Only admin and manager roles can access employee data

-- SELECT policy: admin and manager can view all employees
CREATE POLICY "Admin and manager can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- INSERT policy: admin and manager can add employees
CREATE POLICY "Admin and manager can insert employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- UPDATE policy: admin and manager can update employees
CREATE POLICY "Admin and manager can update employees"
ON public.employees
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

-- DELETE policy: admin and manager can delete employees
CREATE POLICY "Admin and manager can delete employees"
ON public.employees
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);