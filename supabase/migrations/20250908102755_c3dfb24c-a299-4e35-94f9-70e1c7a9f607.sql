-- Update the handle_new_user function to support business users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public' 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, user_role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'business' THEN 'business'::user_role
      ELSE 'both'::user_role
    END
  );
  RETURN NEW;
END;
$$;