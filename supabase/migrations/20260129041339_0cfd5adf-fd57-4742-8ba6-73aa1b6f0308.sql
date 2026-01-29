-- Assign admin role to rb.gumti@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('b1f2e704-f557-4e5b-a6cf-426b8f9b5e08', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;