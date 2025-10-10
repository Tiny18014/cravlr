-- Add default ticket value and premium tier tracking to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS default_ticket_value NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL;

-- Add visit date tracking to referral_clicks
ALTER TABLE public.referral_clicks
ADD COLUMN IF NOT EXISTS visit_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS business_notes TEXT DEFAULT NULL;

-- Create a function to calculate total unpaid commissions for a business
CREATE OR REPLACE FUNCTION public.get_unpaid_commissions(business_user_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(rc.commission_amount), 0)
  FROM public.referral_clicks rc
  JOIN public.business_claims bc ON (
    bc.place_id = rc.place_id OR 
    LOWER(TRIM(bc.restaurant_name)) = LOWER(TRIM(rc.restaurant_name))
  )
  WHERE bc.user_id = business_user_id
    AND bc.status = 'verified'
    AND rc.converted = true
    AND rc.commission_paid = false;
$$;

-- Create a view for business commission summary
CREATE OR REPLACE VIEW public.view_business_commissions AS
SELECT 
  bc.user_id,
  bc.restaurant_name,
  bc.place_id,
  rc.id as click_id,
  rc.clicked_at,
  rc.converted_at as visit_confirmed_at,
  rc.visit_date,
  rc.conversion_value as spend_amount,
  rc.commission_amount,
  rc.commission_paid,
  rc.commission_paid_at,
  rc.business_notes,
  rc.recommender_id,
  p.display_name as recommender_name
FROM public.business_claims bc
JOIN public.referral_clicks rc ON (
  bc.place_id = rc.place_id OR 
  LOWER(TRIM(bc.restaurant_name)) = LOWER(TRIM(rc.restaurant_name))
)
LEFT JOIN public.profiles p ON p.user_id = rc.recommender_id
WHERE bc.status = 'verified'
  AND rc.converted = true;

-- Grant access to the view
GRANT SELECT ON public.view_business_commissions TO authenticated;