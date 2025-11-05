-- Add missing columns to existing tables
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS place_id text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS persona text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_state text;

-- Create business_claims table
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name text NOT NULL,
  place_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  claimed_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims"
ON public.business_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims"
ON public.business_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims"
ON public.business_claims FOR UPDATE
USING (auth.uid() = user_id);

-- Create guru_maps table
CREATE TABLE IF NOT EXISTS public.guru_maps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.guru_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public maps are viewable by everyone"
ON public.guru_maps FOR SELECT
USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own maps"
ON public.guru_maps FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own maps"
ON public.guru_maps FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own maps"
ON public.guru_maps FOR DELETE
USING (auth.uid() = created_by);

-- Create guru_map_places table
CREATE TABLE IF NOT EXISTS public.guru_map_places (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id uuid NOT NULL REFERENCES public.guru_maps(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_name text NOT NULL,
  place_id text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.guru_map_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Map places are viewable if map is viewable"
ON public.guru_map_places FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guru_maps
    WHERE guru_maps.id = guru_map_places.map_id
    AND (guru_maps.is_public = true OR guru_maps.created_by = auth.uid())
  )
);

CREATE POLICY "Users can add places to maps they can view"
ON public.guru_map_places FOR INSERT
WITH CHECK (
  auth.uid() = added_by AND
  EXISTS (
    SELECT 1 FROM public.guru_maps
    WHERE guru_maps.id = guru_map_places.map_id
    AND (guru_maps.is_public = true OR guru_maps.created_by = auth.uid())
  )
);

-- Create guru_map_likes table
CREATE TABLE IF NOT EXISTS public.guru_map_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id uuid NOT NULL REFERENCES public.guru_maps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(map_id, user_id)
);

ALTER TABLE public.guru_map_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
ON public.guru_map_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like maps"
ON public.guru_map_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike maps"
ON public.guru_map_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create view for business commissions
CREATE OR REPLACE VIEW public.view_business_commissions AS
SELECT 
  rc.id as click_id,
  rc.recommendation_id,
  rc.clicked_at,
  rc.visit_confirmed_at,
  rc.converted,
  rc.conversion_value,
  rc.commission_rate,
  rc.commission_paid,
  rc.restaurant_name,
  r.recommender_id,
  r.restaurant_address,
  r.place_id,
  p.display_name as recommender_name
FROM public.referral_clicks rc
JOIN public.recommendations r ON r.id = rc.recommendation_id
JOIN public.profiles p ON p.id = r.recommender_id;

-- Create function to get unpaid commissions
CREATE OR REPLACE FUNCTION public.get_unpaid_commissions(business_user_id uuid)
RETURNS TABLE (
  click_id uuid,
  recommendation_id uuid,
  recommender_name text,
  clicked_at timestamp with time zone,
  visit_confirmed_at timestamp with time zone,
  conversion_value numeric,
  commission_rate numeric,
  commission_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.id as click_id,
    rc.recommendation_id,
    p.display_name as recommender_name,
    rc.clicked_at,
    rc.visit_confirmed_at,
    rc.conversion_value,
    rc.commission_rate,
    (rc.conversion_value * rc.commission_rate / 100) as commission_amount
  FROM public.referral_clicks rc
  JOIN public.recommendations r ON r.id = rc.recommendation_id
  JOIN public.profiles p ON p.id = r.recommender_id
  JOIN public.business_profiles bp ON bp.place_id = r.place_id
  WHERE bp.user_id = business_user_id
  AND rc.converted = true
  AND rc.commission_paid = false;
END;
$$;

-- Create function for request results (used in PopupDebugBinder)
CREATE OR REPLACE FUNCTION public.get_request_results(request_uuid uuid)
RETURNS TABLE (
  recommendation_id uuid,
  recommender_name text,
  restaurant_name text,
  confidence_score integer,
  notes text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as recommendation_id,
    p.display_name as recommender_name,
    r.restaurant_name,
    r.confidence_score,
    r.notes,
    r.created_at
  FROM public.recommendations r
  JOIN public.profiles p ON p.id = r.recommender_id
  WHERE r.request_id = request_uuid
  ORDER BY r.created_at DESC;
END;
$$;