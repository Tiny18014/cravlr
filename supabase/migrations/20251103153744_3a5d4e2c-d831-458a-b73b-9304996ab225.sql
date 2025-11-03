-- Fix Security Issue #1: Security Definer Views Bypass Row-Level Security
-- Change views to SECURITY INVOKER to respect underlying table RLS policies

-- Drop and recreate view_business_commissions with SECURITY INVOKER
DROP VIEW IF EXISTS view_business_commissions;
CREATE VIEW view_business_commissions 
WITH (security_invoker = true)
AS
SELECT 
  bc.user_id,
  rc.id as click_id,
  rc.clicked_at,
  rc.converted_at as visit_confirmed_at,
  rc.visit_date,
  rc.conversion_value as spend_amount,
  rc.commission_amount,
  rc.commission_paid,
  rc.commission_paid_at,
  rc.recommender_id,
  rc.restaurant_name,
  rc.place_id,
  rc.business_notes,
  p.display_name as recommender_name
FROM business_claims bc
JOIN referral_clicks rc ON rc.place_id = bc.place_id
LEFT JOIN profiles p ON p.user_id = rc.recommender_id
WHERE bc.status = 'verified' AND rc.converted = true;

-- Drop and recreate view_referral_conversions_recent with SECURITY INVOKER
DROP VIEW IF EXISTS view_referral_conversions_recent;
CREATE VIEW view_referral_conversions_recent
WITH (security_invoker = true)
AS
SELECT 
  rc.referral_link_id,
  rc.id,
  rc.request_id,
  rc.recommendation_id,
  rc.requester_id,
  rc.recommender_id,
  rc.clicked_at,
  rc.ip_address,
  rc.converted,
  rc.conversion_value,
  rc.converted_at,
  rc.commission_amount,
  rc.commission_paid,
  rc.commission_paid_at,
  rc.converted_at as conversion_at,
  rc.commission_rate,
  rc.reported_by,
  rc.visit_date,
  rc.user_agent,
  rc.restaurant_name,
  rc.place_id,
  rc.click_source,
  rc.conversion_method,
  rc.notes,
  rc.business_notes,
  req_profile.display_name as requester_name,
  rec_profile.display_name as recommender_name
FROM referral_clicks rc
LEFT JOIN profiles req_profile ON req_profile.user_id = rc.requester_id
LEFT JOIN profiles rec_profile ON rec_profile.user_id = rc.recommender_id
WHERE rc.converted = true
  AND rc.converted_at > (now() - interval '90 days');

-- Fix Security Issue #2: RLS Policy Uses Deprecated is_admin Field
-- Update referral_clicks policies to use has_role() instead of profiles.is_admin

DROP POLICY IF EXISTS "Users can view referral clicks they're involved in or admins ca" ON referral_clicks;
DROP POLICY IF EXISTS "Verified admins can update conversion data" ON referral_clicks;

CREATE POLICY "Users and admins can view referral clicks"
ON referral_clicks FOR SELECT
USING (
  (auth.uid() = requester_id) OR
  (auth.uid() = recommender_id) OR
  (auth.uid() = reported_by) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Verified admins can update conversion data"
ON referral_clicks FOR UPDATE
USING (
  is_email_verified() AND
  has_role(auth.uid(), 'admin'::app_role)
);