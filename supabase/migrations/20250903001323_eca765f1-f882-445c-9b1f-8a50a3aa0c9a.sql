-- Create function to notify area users when a new request is created
CREATE OR REPLACE FUNCTION public.notify_area_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  nearby_user_count INTEGER;
BEGIN
  -- Count nearby users first to avoid unnecessary calls
  SELECT COUNT(*) INTO nearby_user_count
  FROM public.profiles
  WHERE location_city = NEW.location_city
  AND location_state = NEW.location_state
  AND user_id != NEW.requester_id
  AND is_active = true;

  -- Only proceed if there are users to notify
  IF nearby_user_count > 0 THEN
    -- This will be handled by the edge function
    -- In production, you'd trigger the edge function here
    -- For now, we'll rely on the client to call the edge function
    NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger to call notification function when requests are created
DROP TRIGGER IF EXISTS on_request_created_notify_area ON public.food_requests;
CREATE TRIGGER on_request_created_notify_area
  AFTER INSERT ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_area_users();