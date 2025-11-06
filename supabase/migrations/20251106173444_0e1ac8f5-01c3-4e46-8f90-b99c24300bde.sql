-- Create referral_links table with proper security

CREATE TABLE IF NOT EXISTS public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  restaurant_name text NOT NULL,
  place_id text,
  maps_url text,
  commission_rate numeric DEFAULT 10.00,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on referral_links
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

-- Block all direct client inserts - only service role (edge functions) can insert
CREATE POLICY "Only service role can insert referral links"
ON public.referral_links
FOR INSERT
WITH CHECK (false);

-- Users can only view referral links for their own recommendations
CREATE POLICY "Users can view their own recommendation links"
ON public.referral_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recommendations
    WHERE recommendations.id = referral_links.recommendation_id
    AND recommendations.recommender_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_referral_links_recommendation_id ON public.referral_links(recommendation_id);
CREATE INDEX idx_referral_links_referral_code ON public.referral_links(referral_code);