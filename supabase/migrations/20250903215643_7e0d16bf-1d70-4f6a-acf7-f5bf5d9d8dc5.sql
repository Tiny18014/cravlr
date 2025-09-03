-- Clean up all request and recommendation data for fresh testing
-- Delete in proper order to handle foreign key constraints

-- Delete points events (conversion bonuses)
DELETE FROM public.points_events;

-- Delete recommendation feedback
DELETE FROM public.recommendation_feedback;

-- Delete referral clicks
DELETE FROM public.referral_clicks;

-- Delete recommendations
DELETE FROM public.recommendations;

-- Delete food requests
DELETE FROM public.food_requests;

-- Reset user points to 0 for clean testing
UPDATE public.profiles 
SET 
  points_total = 0,
  points_this_month = 0,
  reputation_score = 0,
  approval_rate = 0,
  total_feedbacks = 0,
  positive_feedbacks = 0
WHERE points_total > 0 OR points_this_month > 0;

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Successfully cleaned up all request and recommendation data for fresh testing';
END $$;