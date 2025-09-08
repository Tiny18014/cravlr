-- Create business_claims table for restaurant ownership claims
CREATE TABLE public.business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  place_id TEXT,
  business_email TEXT NOT NULL,
  business_phone TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_profiles table for additional business user information
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  business_address TEXT,
  business_website TEXT,
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium')),
  commission_rate NUMERIC(5,4) DEFAULT 0.10 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add business role to existing user_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('requester', 'recommend_only', 'both', 'admin', 'business');
  ELSE
    -- Add business role if it doesn't exist
    BEGIN
      ALTER TYPE user_role ADD VALUE 'business';
    EXCEPTION
      WHEN duplicate_object THEN
        -- Role already exists, do nothing
        NULL;
    END;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_claims
CREATE POLICY "Users can view their own business claims" 
ON public.business_claims 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business claims" 
ON public.business_claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all business claims" 
ON public.business_claims 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

CREATE POLICY "Admins can update business claims" 
ON public.business_claims 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS policies for business_profiles  
CREATE POLICY "Users can view their own business profile" 
ON public.business_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile" 
ON public.business_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile" 
ON public.business_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view verified business profiles" 
ON public.business_profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.business_claims bc 
  WHERE bc.user_id = business_profiles.user_id 
  AND bc.status = 'verified'
));

-- Create triggers for updated_at
CREATE TRIGGER update_business_claims_updated_at
  BEFORE UPDATE ON public.business_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for business analytics
CREATE VIEW public.business_analytics AS
SELECT 
  bc.user_id,
  bc.restaurant_name,
  bc.place_id,
  COUNT(rc.id) as total_clicks,
  COUNT(CASE WHEN rc.converted = true THEN 1 END) as conversions,
  COALESCE(SUM(rc.commission_amount), 0) as total_commission,
  COALESCE(SUM(CASE WHEN rc.commission_paid = true THEN rc.commission_amount ELSE 0 END), 0) as paid_commission,
  COALESCE(SUM(CASE WHEN rc.commission_paid = false AND rc.converted = true THEN rc.commission_amount ELSE 0 END), 0) as pending_commission
FROM public.business_claims bc
LEFT JOIN public.referral_clicks rc ON (
  bc.place_id = rc.place_id OR 
  LOWER(TRIM(bc.restaurant_name)) = LOWER(TRIM(rc.restaurant_name))
)
WHERE bc.status = 'verified'
GROUP BY bc.user_id, bc.restaurant_name, bc.place_id;