-- Add requester and recommender roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'requester';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recommender';

-- Create a function to assign role after signup
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;