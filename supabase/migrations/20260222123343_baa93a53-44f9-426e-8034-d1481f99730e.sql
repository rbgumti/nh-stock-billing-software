
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage patients" ON public.patients;

-- SELECT: only users with a recognized role can view patients
CREATE POLICY "Authorized roles can view patients"
ON public.patients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'reception'::app_role)
  OR has_role(auth.uid(), 'pharma'::app_role)
);

-- INSERT: only users with a recognized role can create patients
CREATE POLICY "Authorized roles can insert patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'reception'::app_role)
  OR has_role(auth.uid(), 'pharma'::app_role)
);

-- UPDATE: only users with a recognized role can update patients
CREATE POLICY "Authorized roles can update patients"
ON public.patients FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'reception'::app_role)
  OR has_role(auth.uid(), 'pharma'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'reception'::app_role)
  OR has_role(auth.uid(), 'pharma'::app_role)
);

-- DELETE: only admin and manager can delete patients
CREATE POLICY "Admin and manager can delete patients"
ON public.patients FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);
