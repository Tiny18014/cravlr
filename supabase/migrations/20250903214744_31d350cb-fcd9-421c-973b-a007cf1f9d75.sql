-- Add missing conversion tracking fields to referral_clicks table
ALTER TABLE public.referral_clicks 
ADD COLUMN IF NOT EXISTS restaurant_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS click_source text NOT NULL DEFAULT 'link',
ADD COLUMN IF NOT EXISTS conversion_method text,
ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS reported_by uuid,
ADD COLUMN IF NOT EXISTS notes text;

-- Ensure converted column has proper default if not set
UPDATE public.referral_clicks SET converted = false WHERE converted IS NULL;
ALTER TABLE public.referral_clicks ALTER COLUMN converted SET DEFAULT false;
ALTER TABLE public.referral_clicks ALTER COLUMN converted SET NOT NULL;