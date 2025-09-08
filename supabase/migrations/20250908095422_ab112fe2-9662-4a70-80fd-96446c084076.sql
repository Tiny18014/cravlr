-- Drop the existing view that has security issues
DROP VIEW IF EXISTS public.business_analytics;

-- Create a secure function instead of a view for business analytics
CREATE OR REPLACE FUNCTION public.get_business_analytics(business_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  restaurant_name TEXT,
  place_id TEXT,
  total_clicks BIGINT,
  conversions BIGINT,
  total_commission NUMERIC,
  paid_commission NUMERIC,
  pending_commission NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND (business_user_id IS NULL OR bc.user_id = business_user_id)
    AND (
      -- Allow if user is requesting their own data
      bc.user_id = auth.uid() 
      -- Or if user is admin
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
      )
    )
  GROUP BY bc.user_id, bc.restaurant_name, bc.place_id;
$$;