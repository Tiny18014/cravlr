-- Fix #2: Set replica identity for reliable realtime updates
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;

-- Create trigger function to notify when request results are ready
CREATE OR REPLACE FUNCTION public.notify_request_results()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a request moves into a terminal/results state
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status IN ('expired','closed','fulfilled')
        AND NEW.status IS DISTINCT FROM OLD.status) THEN
      INSERT INTO public.notifications (requester_id, request_id, type, payload)
      VALUES (NEW.requester_id, NEW.id, 'request_results', jsonb_build_object(
        'title', 'Your results are ready! 🎉',
        'message', 'Tap to view the best picks for your ' || NEW.food_type || ' request.'
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_request_results ON public.food_requests;

CREATE TRIGGER trg_notify_request_results
AFTER UPDATE ON public.food_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_request_results();

-- Fix #4: Create safer RPC for results to avoid JOIN traps
CREATE OR REPLACE FUNCTION public.get_request_results(p_request_id UUID)
RETURNS TABLE (
  request_id UUID,
  status TEXT,
  food_type TEXT,
  place_id TEXT,
  restaurant_name TEXT,
  mention_count INT,
  rec_ids UUID[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH recs AS (
    SELECT r.request_id, r.place_id, r.restaurant_name,
           COUNT(*) as mention_count,
           array_agg(r.id) as rec_ids
    FROM public.recommendations r
    WHERE r.request_id = p_request_id
    GROUP BY r.request_id, r.place_id, r.restaurant_name
  )
  SELECT fr.id as request_id,
         fr.status,
         fr.food_type,
         recs.place_id,
         recs.restaurant_name,
         COALESCE(recs.mention_count, 0) as mention_count,
         COALESCE(recs.rec_ids, '{}') as rec_ids
  FROM public.food_requests fr
  LEFT JOIN recs ON recs.request_id = fr.id
  WHERE fr.id = p_request_id
    AND (fr.requester_id = auth.uid() OR fr.status = 'active');
$$;