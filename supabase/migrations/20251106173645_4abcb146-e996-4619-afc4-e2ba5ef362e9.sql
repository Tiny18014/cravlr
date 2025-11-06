-- Add missing user identification columns to referral_clicks

ALTER TABLE public.referral_clicks 
ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recommender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.food_requests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS referral_link_id uuid REFERENCES public.referral_links(id) ON DELETE SET NULL;

-- Backfill requester_id and recommender_id from recommendations table
UPDATE public.referral_clicks rc
SET 
  recommender_id = r.recommender_id,
  request_id = r.request_id,
  requester_id = (SELECT requester_id FROM public.food_requests WHERE id = r.request_id)
FROM public.recommendations r
WHERE rc.recommendation_id = r.id
AND rc.recommender_id IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Drop any existing broken policies
DROP POLICY IF EXISTS "Users can view referral clicks they're involved in or admins can view all" ON public.referral_clicks;
DROP POLICY IF EXISTS "Only admins can update conversion data" ON public.referral_clicks;
DROP POLICY IF EXISTS "Anyone can view referral clicks" ON public.referral_clicks;

-- Create proper SELECT policy - users can see their own clicks, admins can see all
CREATE POLICY "Users view their clicks, admins view all"
ON public.referral_clicks
FOR SELECT
USING (
  auth.uid() = requester_id OR
  auth.uid() = recommender_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create proper UPDATE policy for admins only
CREATE POLICY "Only admins can update conversions"
ON public.referral_clicks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Block direct inserts - only service role can insert
CREATE POLICY "Only service role can insert clicks"
ON public.referral_clicks
FOR INSERT
WITH CHECK (false);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_clicks_requester_id ON public.referral_clicks(requester_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_recommender_id ON public.referral_clicks(recommender_id);