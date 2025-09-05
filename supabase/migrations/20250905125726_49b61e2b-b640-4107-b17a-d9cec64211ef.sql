-- Update the notify_request_results function to only send notifications when there are recommendations
CREATE OR REPLACE FUNCTION public.notify_request_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recommendation_count INTEGER;
BEGIN
  -- When a request moves into a terminal/results state
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status IN ('expired','closed','fulfilled')
        AND NEW.status IS DISTINCT FROM OLD.status) THEN
      
      -- Check if there are any recommendations for this request
      SELECT COUNT(*) INTO recommendation_count
      FROM public.recommendations
      WHERE request_id = NEW.id;
      
      -- Only send notification if there are recommendations
      IF recommendation_count > 0 THEN
        INSERT INTO public.notifications (requester_id, request_id, type, payload)
        VALUES (NEW.requester_id, NEW.id, 'request_results', jsonb_build_object(
          'title', 'Your results are ready! 🎉',
          'message', 'Tap to view the best picks for your ' || NEW.food_type || ' request.',
          'recommendation_count', recommendation_count
        ));
      ELSE
        -- Log that no notification was sent due to no recommendations
        RAISE NOTICE 'No notification sent for request % - no recommendations found', NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$