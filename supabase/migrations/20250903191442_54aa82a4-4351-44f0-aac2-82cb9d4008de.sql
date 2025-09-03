-- Create referral tracking tables for commission-per-lead system

-- Table to store generated referral links for each recommendation
CREATE TABLE public.referral_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  place_id TEXT,
  maps_url TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Table to track referral clicks and conversions
CREATE TABLE public.referral_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_link_id UUID NOT NULL REFERENCES public.referral_links(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  recommender_id UUID NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address INET,
  converted BOOLEAN DEFAULT false,
  conversion_value NUMERIC,
  converted_at TIMESTAMP WITH TIME ZONE,
  commission_amount NUMERIC,
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_links
CREATE POLICY "Anyone can view referral links for active requests" 
ON public.referral_links 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.food_requests 
    WHERE food_requests.id = referral_links.request_id 
    AND (food_requests.status = 'active'::request_status OR food_requests.requester_id = auth.uid())
  )
);

CREATE POLICY "System can insert referral links" 
ON public.referral_links 
FOR INSERT 
WITH CHECK (true); -- This will be used by edge functions

-- RLS policies for referral_clicks  
CREATE POLICY "Users can view their own referral clicks" 
ON public.referral_clicks 
FOR SELECT 
USING (
  auth.uid() = requester_id OR 
  auth.uid() = recommender_id OR
  EXISTS (
    SELECT 1 FROM public.food_requests 
    WHERE food_requests.id = referral_clicks.request_id 
    AND food_requests.requester_id = auth.uid()
  )
);

CREATE POLICY "System can insert referral clicks" 
ON public.referral_clicks 
FOR INSERT 
WITH CHECK (true); -- This will be used by edge functions

CREATE POLICY "System can update referral clicks for conversions" 
ON public.referral_clicks 
FOR UPDATE 
USING (true); -- This will be used by edge functions to mark conversions

-- Indexes for better performance
CREATE INDEX idx_referral_links_recommendation_id ON public.referral_links(recommendation_id);
CREATE INDEX idx_referral_links_request_id ON public.referral_links(request_id);
CREATE INDEX idx_referral_links_referral_code ON public.referral_links(referral_code);
CREATE INDEX idx_referral_clicks_referral_link_id ON public.referral_clicks(referral_link_id);
CREATE INDEX idx_referral_clicks_request_id ON public.referral_clicks(request_id);
CREATE INDEX idx_referral_clicks_clicked_at ON public.referral_clicks(clicked_at);

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text || now()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.referral_links 
    WHERE referral_code = code;
    
    -- If unique, return the code
    IF exists_check = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;