-- Add authorization checks to SECURITY DEFINER functions
-- These functions are already protected by RLS on the triggering tables,
-- but adding explicit checks provides defense-in-depth

-- Update update_recommender_reputation to verify the recommendation exists
-- and is associated with a valid recommender
CREATE OR REPLACE FUNCTION public.update_recommender_reputation(rec_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recommender_user_id UUID;
  total_count INTEGER;
  positive_count INTEGER;
  new_approval_rate NUMERIC(5,2);
  new_reputation NUMERIC(5,2);
  new_multiplier NUMERIC(3,2);
BEGIN
  -- Get recommender_id from recommendation
  SELECT recommender_id INTO recommender_user_id
  FROM public.recommendations
  WHERE id = rec_id;

  -- Security check: ensure recommendation exists
  IF recommender_user_id IS NULL THEN
    RAISE WARNING 'update_recommender_reputation: Invalid recommendation ID: %', rec_id;
    RETURN;
  END IF;

  -- Calculate feedback statistics for this recommender
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN feedback_type = 'thumbs_up' THEN 1 END)
  INTO total_count, positive_count
  FROM public.recommendation_feedback rf
  JOIN public.recommendations r ON r.id = rf.recommendation_id
  WHERE r.recommender_id = recommender_user_id;

  -- Calculate approval rate
  IF total_count > 0 THEN
    new_approval_rate = (positive_count::NUMERIC / total_count::NUMERIC) * 100;
  ELSE
    new_approval_rate = 0.0;
  END IF;

  -- Calculate reputation score (0-100 scale)
  new_reputation = new_approval_rate;
  IF total_count >= 10 THEN
    new_reputation = new_reputation + LEAST(total_count * 0.5, 10);
  END IF;
  new_reputation = LEAST(new_reputation, 100.0);

  -- Calculate multiplier based on approval rate and minimum feedback count
  IF total_count < 3 THEN
    new_multiplier = 1.0;
  ELSIF new_approval_rate >= 90 THEN
    new_multiplier = 1.2;
  ELSIF new_approval_rate < 70 THEN
    new_multiplier = 0.8;
  ELSE
    new_multiplier = 1.0;
  END IF;

  -- Update profile with new reputation metrics
  UPDATE public.profiles
  SET 
    reputation_score = new_reputation,
    approval_rate = new_approval_rate,
    total_feedbacks = total_count,
    positive_feedbacks = positive_count
  WHERE id = recommender_user_id;
END;
$function$;

-- Update award_points_with_feedback with authorization check
CREATE OR REPLACE FUNCTION public.award_points_with_feedback(
  rec_id UUID,
  base_points INTEGER,
  feedback_bonus INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recommender_user_id UUID;
  current_multiplier NUMERIC(3,2);
  final_points INTEGER;
  calling_user_id UUID;
BEGIN
  -- Get the calling user (for authorization)
  calling_user_id := auth.uid();
  
  -- Get recommendation details
  SELECT 
    recommender_id,
    COALESCE(reputation_multiplier, 1.0)
  INTO 
    recommender_user_id,
    current_multiplier
  FROM public.recommendations
  WHERE id = rec_id;

  -- Security check: ensure recommendation exists
  IF recommender_user_id IS NULL THEN
    RAISE WARNING 'award_points_with_feedback: Invalid recommendation ID: %', rec_id;
    RETURN;
  END IF;

  -- Authorization check: only allow if called by system (NULL auth.uid from trigger)
  -- or by admin role
  IF calling_user_id IS NOT NULL AND NOT public.has_role(calling_user_id, 'admin') THEN
    RAISE EXCEPTION 'award_points_with_feedback: Unauthorized access attempt by user %', calling_user_id;
  END IF;

  -- Calculate final points with multiplier and feedback bonus
  final_points = ROUND((base_points + feedback_bonus) * current_multiplier);

  -- Update recommendation with awarded points
  UPDATE public.recommendations
  SET 
    awarded_points = final_points,
    awarded_at = now()
  WHERE id = rec_id;

  -- Update user's total points
  UPDATE public.profiles
  SET 
    points_total = points_total + final_points,
    points_this_month = points_this_month + final_points
  WHERE id = recommender_user_id;

  -- Update reputation after awarding points
  PERFORM public.update_recommender_reputation(rec_id);
END;
$$;

-- Update handle_feedback_change trigger function with validation
CREATE OR REPLACE FUNCTION public.handle_feedback_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: verify the recommendation exists
  IF NOT EXISTS (SELECT 1 FROM public.recommendations WHERE id = NEW.recommendation_id) THEN
    RAISE WARNING 'handle_feedback_change: Invalid recommendation ID: %', NEW.recommendation_id;
    RETURN NEW;
  END IF;

  -- Update reputation for the recommender
  PERFORM public.update_recommender_reputation(NEW.recommendation_id);
  RETURN NEW;
END;
$$;