-- Clean up all test data while preserving user accounts and structure
-- This will remove all requests, recommendations, referrals, and related data

-- Truncate tables in correct order to handle dependencies
TRUNCATE TABLE public.recommendation_feedback CASCADE;
TRUNCATE TABLE public.referral_clicks CASCADE;
TRUNCATE TABLE public.referral_links CASCADE;
TRUNCATE TABLE public.recommendations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.request_user_state CASCADE;
TRUNCATE TABLE public.food_requests CASCADE;
TRUNCATE TABLE public.action_rate_limits CASCADE;
TRUNCATE TABLE public.points_events CASCADE;
TRUNCATE TABLE public.business_claims CASCADE;
TRUNCATE TABLE public.business_profiles CASCADE;
TRUNCATE TABLE public.push_subscriptions CASCADE;

-- Reset points for all users
UPDATE public.profiles 
SET 
  points_total = 0,
  points_this_month = 0,
  reputation_score = 0.0,
  approval_rate = 0.0,
  total_feedbacks = 0,
  positive_feedbacks = 0;