-- Fix Security Definer View with correct column names
DROP VIEW IF EXISTS public.view_business_commissions;

CREATE VIEW public.view_business_commissions
WITH (security_invoker = true)
AS
SELECT 
  bc.user_id,
  rc.id as click_id,
  rc.clicked_at,
  rc.visit_confirmed_at,
  rc.conversion_value,
  rc.commission_rate,
  rc.commission_paid,
  rc.converted,
  r.id as recommendation_id,
  r.restaurant_name,
  r.restaurant_address,
  r.place_id,
  r.recommender_id,
  p.display_name as recommender_name
FROM public.business_claims bc
JOIN public.recommendations r ON r.place_id = bc.place_id
JOIN public.referral_clicks rc ON rc.recommendation_id = r.id
JOIN public.profiles p ON p.id = r.recommender_id
WHERE rc.converted = true;