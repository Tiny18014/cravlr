-- Drop the security definer view and recreate without security definer
DROP VIEW IF EXISTS public.view_business_commissions;

-- Recreate view without security definer (relies on RLS of underlying tables)
CREATE VIEW public.view_business_commissions AS
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

GRANT SELECT ON public.view_business_commissions TO authenticated;