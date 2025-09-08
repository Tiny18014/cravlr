-- Create function to mark referral conversions
CREATE OR REPLACE FUNCTION public.mark_conversion(
  p_referral_click_id uuid,
  p_conversion_method text DEFAULT 'business_verified',
  p_conversion_value numeric DEFAULT NULL,
  p_commission_rate numeric DEFAULT 0.10,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  converted boolean,
  conversion_value numeric,
  commission_amount numeric,
  recommender_id uuid,
  restaurant_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  click_record RECORD;
  calculated_commission numeric;
BEGIN
  -- Get the referral click record
  SELECT * INTO click_record
  FROM public.referral_clicks
  WHERE referral_clicks.id = p_referral_click_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral click not found';
  END IF;

  -- Check if already converted
  IF click_record.converted = true THEN
    RAISE EXCEPTION 'This referral has already been marked as converted';
  END IF;

  -- Calculate commission
  calculated_commission := COALESCE(p_conversion_value, 0) * p_commission_rate;

  -- Update the referral click
  UPDATE public.referral_clicks
  SET 
    converted = true,
    converted_at = now(),
    conversion_at = now(),
    conversion_method = p_conversion_method,
    conversion_value = p_conversion_value,
    commission_rate = p_commission_rate,
    commission_amount = calculated_commission,
    notes = p_notes,
    reported_by = auth.uid()
  WHERE referral_clicks.id = p_referral_click_id;

  -- Award points (30 points per $1 commission)
  IF calculated_commission > 0 THEN
    UPDATE public.profiles
    SET 
      points_total = points_total + FLOOR(calculated_commission * 30),
      points_this_month = points_this_month + FLOOR(calculated_commission * 30)
    WHERE user_id = click_record.recommender_id;

    -- Insert points event
    INSERT INTO public.points_events (
      user_id,
      points,
      type,
      referral_click_id
    ) VALUES (
      click_record.recommender_id,
      FLOOR(calculated_commission * 30),
      'conversion_bonus',
      p_referral_click_id
    );
  END IF;

  -- Return the updated record
  RETURN QUERY
  SELECT 
    click_record.id,
    true as converted,
    p_conversion_value as conversion_value,
    calculated_commission as commission_amount,
    click_record.recommender_id,
    click_record.restaurant_name;
END;
$$;