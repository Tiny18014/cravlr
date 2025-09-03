-- Create the view for recent conversions
CREATE OR REPLACE VIEW public.view_referral_conversions_recent AS
SELECT 
  rc.*,
  req_profile.display_name as requester_name,
  rec_profile.display_name as recommender_name,
  pe.points as awarded_points
FROM public.referral_clicks rc
LEFT JOIN public.profiles req_profile ON rc.requester_id = req_profile.user_id
LEFT JOIN public.profiles rec_profile ON rc.recommender_id = rec_profile.user_id
LEFT JOIN public.points_events pe ON rc.id = pe.referral_click_id AND pe.type = 'conversion_bonus'
WHERE rc.clicked_at >= now() - interval '90 days'
ORDER BY rc.conversion_at DESC NULLS LAST, rc.clicked_at DESC;