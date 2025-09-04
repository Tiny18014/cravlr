-- Fix security definer view by recreating it as a regular view
DROP VIEW IF EXISTS public.view_referral_conversions_recent;

-- Recreate the view without security definer (regular view)
CREATE VIEW public.view_referral_conversions_recent AS
SELECT rc.id,
    rc.referral_link_id,
    rc.request_id,
    rc.recommendation_id,
    rc.requester_id,
    rc.recommender_id,
    rc.clicked_at,
    rc.user_agent,
    rc.ip_address,
    rc.converted,
    rc.conversion_value,
    rc.converted_at,
    rc.commission_amount,
    rc.commission_paid,
    rc.commission_paid_at,
    rc.restaurant_name,
    rc.place_id,
    rc.click_source,
    rc.conversion_at,
    rc.conversion_method,
    rc.commission_rate,
    rc.reported_by,
    rc.notes,
    req_profile.display_name AS requester_name,
    rec_profile.display_name AS recommender_name,
    pe.points AS awarded_points
FROM referral_clicks rc
LEFT JOIN profiles req_profile ON (rc.requester_id = req_profile.user_id)
LEFT JOIN profiles rec_profile ON (rc.recommender_id = rec_profile.user_id)
LEFT JOIN points_events pe ON (rc.id = pe.referral_click_id AND pe.type = 'conversion_bonus')
WHERE rc.clicked_at >= (now() - interval '90 days')
ORDER BY rc.conversion_at DESC NULLS LAST, rc.clicked_at DESC;

-- Add RLS policy for the view to ensure proper access control
ALTER VIEW public.view_referral_conversions_recent SET (security_invoker = true);

-- Move extensions out of public schema to fix the extension warning
-- Note: pg_cron and pg_net are already installed in the extensions schema by default in Supabase