-- Create a new table for recommender notifications
-- (Keeping existing notifications table for requester notifications)
CREATE TABLE public.recommender_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommender_id UUID NOT NULL,
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'accepted', 'declined'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommender_notifications ENABLE ROW LEVEL SECURITY;

-- Recommenders can view their own notifications
CREATE POLICY "Recommenders can view their own notifications"
ON public.recommender_notifications
FOR SELECT
USING (auth.uid() = recommender_id);

-- Recommenders can update (mark as read) their own notifications
CREATE POLICY "Recommenders can update their own notifications"
ON public.recommender_notifications
FOR UPDATE
USING (auth.uid() = recommender_id);

-- Only service role can insert notifications (edge functions)
CREATE POLICY "Only service role can insert notifications"
ON public.recommender_notifications
FOR INSERT
WITH CHECK (false);

-- Add index for faster queries
CREATE INDEX idx_recommender_notifications_recommender_id ON public.recommender_notifications(recommender_id);
CREATE INDEX idx_recommender_notifications_read ON public.recommender_notifications(read);