-- Migration to trigger Edge Function when a new food request is inserted
-- This webhook triggers 'notify-area-users'

CREATE OR REPLACE FUNCTION public.trigger_notify_area_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function via pg_net
  -- NOTE: This trigger attempts to call the Edge Function.
  -- IMPORTANT: You must configure the URL and Authorization header in the Supabase Dashboard Webhooks
  -- or update the placeholder values below if you intend to manage this via SQL.

  -- The following block is commented out to prevent migration errors due to placeholders.
  -- To enable via SQL, uncomment and replace 'REPLACE_WITH_PROJECT_REF' and 'REPLACE_WITH_SERVICE_ROLE_KEY'.

  /*
  PERFORM net.http_post(
    url := 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1/notify-area-users',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'REPLACE_WITH_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'requestId', NEW.id
    )
  );
  */

  -- For now, we assume the user will configure the webhook in the Dashboard targeting 'notify-area-users'
  -- with the payload { "requestId": "..." }

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_food_request_created ON public.food_requests;

CREATE TRIGGER on_food_request_created
AFTER INSERT ON public.food_requests
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_area_users();
