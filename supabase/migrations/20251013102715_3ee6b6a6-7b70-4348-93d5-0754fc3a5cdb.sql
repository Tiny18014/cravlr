-- Fix the handle_new_user function to use the correct column name 'persona' instead of 'user_role'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, persona)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'business' THEN 'business'::persona
      ELSE 'both'::persona
    END
  );
  RETURN NEW;
END;
$$;