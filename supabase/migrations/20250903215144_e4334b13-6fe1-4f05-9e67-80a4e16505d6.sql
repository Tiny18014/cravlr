-- Just set up admin user for testing
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  LIMIT 1
);