-- Create feedback table for app experience feedback
CREATE TABLE public.app_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('requester', 'recommender')),
  experience_tags TEXT[] DEFAULT '{}',
  feedback_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  source_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can create their own feedback"
ON public.app_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.app_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.app_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for performance
CREATE INDEX idx_app_feedback_user_id ON public.app_feedback(user_id);
CREATE INDEX idx_app_feedback_created_at ON public.app_feedback(created_at DESC);