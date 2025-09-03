-- Add conversion tracking fields to referral_clicks table
ALTER TABLE public.referral_clicks 
ADD COLUMN IF NOT EXISTS restaurant_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS click_source text NOT NULL DEFAULT 'link',
ADD COLUMN IF NOT EXISTS converted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS conversion_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS conversion_method text,
ADD COLUMN IF NOT EXISTS conversion_value numeric(10,2),
ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS reported_by uuid,
ADD COLUMN IF NOT EXISTS notes text;

-- Also ensure profiles has the admin field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;