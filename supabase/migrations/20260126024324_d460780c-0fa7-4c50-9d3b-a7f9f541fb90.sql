-- Fix the email that was stored without .com
UPDATE public.profiles 
SET email = 'navjeevanma@hotmail.com' 
WHERE email = 'navjeevanma@hotmail';