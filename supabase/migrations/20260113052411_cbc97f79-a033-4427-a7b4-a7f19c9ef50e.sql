-- Add request_id column to recommender_notifications table
ALTER TABLE public.recommender_notifications 
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.food_requests(id);

-- Create index for faster lookups by request_id
CREATE INDEX IF NOT EXISTS idx_recommender_notifications_request_id 
ON public.recommender_notifications(request_id);

-- Add unique constraint to prevent duplicate notifications
-- This prevents the same recommender from getting duplicate notifications for the same request and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommender_notifications_unique_per_request
ON public.recommender_notifications(recommender_id, request_id, type)
WHERE request_id IS NOT NULL;