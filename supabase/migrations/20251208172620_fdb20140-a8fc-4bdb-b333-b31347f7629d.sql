-- =============================================
-- 1. Device Tokens table for push notifications
-- =============================================
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  is_active boolean NOT NULL DEFAULT true,
  app_version text,
  last_used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- OneSignal player ID if using OneSignal
  onesignal_player_id text,
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own tokens
CREATE POLICY "Users can view their own device tokens"
  ON public.device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
  ON public.device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON public.device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON public.device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON public.device_tokens(is_active) WHERE is_active = true;

-- =============================================
-- 2. Add profile picture and default location to profiles
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS profile_lat double precision,
  ADD COLUMN IF NOT EXISTS profile_lng double precision,
  ADD COLUMN IF NOT EXISTS profile_country text,
  ADD COLUMN IF NOT EXISTS notification_radius_km integer DEFAULT 20;

-- =============================================
-- 3. Add lat/lng to food_requests if not present
-- =============================================
ALTER TABLE public.food_requests
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS country_code text;

-- Create index for geo queries on food_requests
CREATE INDEX IF NOT EXISTS idx_food_requests_location 
  ON public.food_requests(lat, lng) 
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- =============================================
-- 4. Create storage bucket for profile pictures
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile picture"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 5. Notification queue table for background processing
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type text NOT NULL,
  payload jsonb NOT NULL,
  target_user_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  scheduled_for timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS (service role only)
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access notification queue
CREATE POLICY "Service role only for notification queue"
  ON public.notification_queue
  FOR ALL
  USING (false);

-- Index for processing
CREATE INDEX idx_notification_queue_pending 
  ON public.notification_queue(scheduled_for) 
  WHERE status = 'pending';

-- =============================================
-- 6. Add updated_at trigger for device_tokens
-- =============================================
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();