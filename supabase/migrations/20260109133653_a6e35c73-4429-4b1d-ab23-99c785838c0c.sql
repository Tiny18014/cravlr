-- Add phone number and SMS notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_new_requests BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_recommendations BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_visit_reminders BOOLEAN DEFAULT true;

-- Update handle_new_user function to save phone number from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone_number, streak_count, total_points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'phone_number',
    0,
    0
  );
  RETURN NEW;
END;
$function$;