-- Fix numeric variable precision in the update_recommender_reputation function
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
  new_approval_rate NUMERIC(5,2);  -- Fixed: was 4,2
  new_reputation NUMERIC(5,2);     -- Fixed: was 4,2
  new_multiplier NUMERIC(3,2);
BEGIN
  -- Get recommender_id from recommendation
  SELECT recommender_id INTO recommender_user_id
  FROM public.recommendations
  WHERE id = rec_id;

  IF recommender_user_id IS NULL THEN
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
  -- Base score from approval rate, bonus for volume
  new_reputation = new_approval_rate;
  IF total_count >= 10 THEN
    new_reputation = new_reputation + LEAST(total_count * 0.5, 10); -- Up to +10 for volume
  END IF;
  new_reputation = LEAST(new_reputation, 100.0);

  -- Calculate multiplier based on approval rate and minimum feedback count
  IF total_count < 3 THEN
    new_multiplier = 1.0; -- No penalty/bonus until 3 feedbacks
  ELSIF new_approval_rate >= 90 THEN
    new_multiplier = 1.2; -- 20% bonus for excellent performance
  ELSIF new_approval_rate < 70 THEN
    new_multiplier = 0.8; -- 20% penalty for poor performance
  ELSE
    new_multiplier = 1.0; -- Normal multiplier
  END IF;

  -- Update profile with new reputation metrics
  UPDATE public.profiles
  SET 
    reputation_score = new_reputation,
    approval_rate = new_approval_rate,
    total_feedbacks = total_count,
    positive_feedbacks = positive_count
  WHERE user_id = recommender_user_id;

  -- Update multiplier for future recommendations
  -- (existing recommendations keep their original points)
END;
$function$;