-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.set_expires_at_from_response_window()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.expires_at = NEW.created_at + INTERVAL '1 minute' * NEW.response_window;
  RETURN NEW;
END;
$$;