-- Fix 1: Add authorization check to get_request_results function
CREATE OR REPLACE FUNCTION public.get_request_results(request_uuid uuid)
RETURNS TABLE(
  recommendation_id uuid,
  recommender_name text,
  restaurant_name text,
  confidence_score integer,
  notes text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: verify caller is request owner or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.food_requests 
    WHERE id = request_uuid 
    AND (
      requester_id = auth.uid() 
      OR public.has_role(auth.uid(), 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this request';
  END IF;

  -- Return results if authorized
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
$function$;

-- Fix 2: Create bootstrap function for first admin
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_count integer;
BEGIN
  -- Check if any admins exist
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  -- Only allow bootstrap if no admins exist
  IF admin_count = 0 THEN
    -- Make the calling user an admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Admin already exists. Use assign_user_role for additional admins.';
  END IF;
END;
$function$;