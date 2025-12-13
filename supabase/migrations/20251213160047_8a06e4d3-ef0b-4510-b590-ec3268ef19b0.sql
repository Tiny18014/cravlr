-- Add email notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_new_requests boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_recommendations boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_visit_reminders boolean DEFAULT true;

-- Create email notification logs table for idempotency and debugging
CREATE TABLE IF NOT EXISTS public.email_notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  provider_message_id text,
  email_to text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate emails for the same event
CREATE UNIQUE INDEX IF NOT EXISTS email_notification_logs_unique_event 
ON public.email_notification_logs (user_id, event_type, entity_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS email_notification_logs_user_id_idx 
ON public.email_notification_logs (user_id);

CREATE INDEX IF NOT EXISTS email_notification_logs_event_type_idx 
ON public.email_notification_logs (event_type);

CREATE INDEX IF NOT EXISTS email_notification_logs_entity_id_idx 
ON public.email_notification_logs (entity_id);

-- Enable RLS on email_notification_logs
ALTER TABLE public.email_notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
ON public.email_notification_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Only service role can insert/update email logs (via edge functions)
CREATE POLICY "Service role can manage email logs"
ON public.email_notification_logs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.email_notification_logs IS 'Tracks all email notifications sent to prevent duplicates and enable debugging';