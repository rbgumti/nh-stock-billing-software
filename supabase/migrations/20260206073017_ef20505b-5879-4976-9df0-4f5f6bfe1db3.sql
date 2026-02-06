-- Fix recursive RLS policy on public.user_roles that prevents admins from reading roles
-- The previous policy queried user_roles inside a user_roles policy, causing infinite recursion.

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
