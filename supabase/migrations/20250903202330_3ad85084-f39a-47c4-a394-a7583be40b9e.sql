-- Create enum for feedback types
CREATE TYPE public.feedback_type AS ENUM ('thumbs_up', 'thumbs_down');

-- Create recommendation_feedback table to track requester feedback
CREATE TABLE public.recommendation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  feedback_type public.feedback_type NOT NULL,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recommendation_id, requester_id)
);

-- Enable RLS on recommendation_feedback
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for recommendation_feedback
CREATE POLICY "Requesters can create feedback for recommendations they received" 
ON public.recommendation_feedback 
FOR INSERT 
WITH CHECK (
  auth.uid() = requester_id AND 
  EXISTS (
    SELECT 1 FROM public.food_requests fr 
    JOIN public.recommendations r ON r.request_id = fr.id 
    WHERE r.id = recommendation_id AND fr.requester_id = auth.uid()
  )
);

CREATE POLICY "Users can view feedback for their own recommendations" 
ON public.recommendation_feedback 
FOR SELECT 
USING (
  auth.uid() = requester_id OR 
  EXISTS (
    SELECT 1 FROM public.recommendations r 
    WHERE r.id = recommendation_id AND r.recommender_id = auth.uid()
  )
);

-- Add reputation fields to recommendations table
ALTER TABLE public.recommendations 
ADD COLUMN awarded_points INTEGER DEFAULT 0,
ADD COLUMN awarded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reputation_multiplier NUMERIC(3,2) DEFAULT 1.0;

-- Add reputation fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN reputation_score NUMERIC(4,2) DEFAULT 0.0,
ADD COLUMN approval_rate NUMERIC(4,2) DEFAULT 0.0,
ADD COLUMN total_feedbacks INTEGER DEFAULT 0,
ADD COLUMN positive_feedbacks INTEGER DEFAULT 0;

-- Create function to calculate and update reputation
CREATE OR REPLACE FUNCTION public.update_recommender_reputation(rec_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recommender_user_id UUID;
  total_count INTEGER;
  positive_count INTEGER;
  new_approval_rate NUMERIC(4,2);
  new_reputation NUMERIC(4,2);
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
$$;

-- Create function to award points with feedback bonus
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
BEGIN
  -- Get recommendation details
  SELECT 
    recommender_id,
    COALESCE(reputation_multiplier, 1.0)
  INTO 
    recommender_user_id,
    current_multiplier
  FROM public.recommendations
  WHERE id = rec_id;

  IF recommender_user_id IS NULL THEN
    RETURN;
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
  WHERE user_id = recommender_user_id;

  -- Update reputation after awarding points
  PERFORM public.update_recommender_reputation(rec_id);
END;
$$;

-- Create trigger to update reputation when feedback is added
CREATE OR REPLACE FUNCTION public.handle_feedback_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update reputation for the recommender
  PERFORM public.update_recommender_reputation(NEW.recommendation_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_reputation_on_feedback
  AFTER INSERT OR UPDATE ON public.recommendation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_feedback_change();