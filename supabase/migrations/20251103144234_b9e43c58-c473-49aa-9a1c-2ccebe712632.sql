-- Allow anonymous feedback by making user_id nullable
ALTER TABLE public.app_feedback
ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing restrictive RLS policies if any
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.app_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.app_feedback;

-- Enable RLS on app_feedback table
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous users) to insert feedback
CREATE POLICY "Anyone can submit feedback"
ON public.app_feedback
FOR INSERT
TO public
WITH CHECK (true);

-- Users can view their own feedback (if logged in)
CREATE POLICY "Users can view own feedback"
ON public.app_feedback
FOR SELECT
TO public
USING (
  user_id IS NULL 
  OR user_id = auth.uid()
);

-- Add index for better query performance on non-null user_ids
CREATE INDEX IF NOT EXISTS idx_app_feedback_user_id
ON public.app_feedback(user_id)
WHERE user_id IS NOT NULL;