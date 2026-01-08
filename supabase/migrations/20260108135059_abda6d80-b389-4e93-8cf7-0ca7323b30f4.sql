-- First, delete duplicate notifications keeping only the oldest one
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.id > b.id 
AND a.requester_id = b.requester_id 
AND a.request_id = b.request_id 
AND a.type = b.type;

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS unique_requester_notification 
ON public.notifications (requester_id, request_id, type);

-- Add push tracking columns to notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS push_attempted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS push_sent boolean DEFAULT false;