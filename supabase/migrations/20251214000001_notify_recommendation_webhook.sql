-- Migration to trigger Edge Function when a new recommendation is inserted
-- This webhook triggers 'notify-new-recommendation'

CREATE OR REPLACE FUNCTION public.trigger_notify_new_recommendation()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function via pg_net
  -- NOTE: This trigger attempts to call the Edge Function.
  -- IMPORTANT: You must configure the URL and Authorization header in the Supabase Dashboard Webhooks
  -- or update the placeholder values below if you intend to manage this via SQL.
  -- Hardcoding secrets in SQL is discouraged.

  -- The following block is commented out to prevent migration errors due to placeholders.
  -- To enable via SQL, uncomment and replace 'REPLACE_WITH_PROJECT_REF' and 'REPLACE_WITH_SERVICE_ROLE_KEY'.

  /*
  PERFORM net.http_post(
    url := 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1/notify-new-recommendation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'REPLACE_WITH_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'recommendations',
      'record', row_to_json(NEW),
      'schema', 'public'
    )
  );
  */

  -- Alternative: Use Supabase Dashboard to create a webhook that targets the function URL.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_recommendation_created ON public.recommendations;

CREATE TRIGGER on_recommendation_created
AFTER INSERT ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_new_recommendation();
