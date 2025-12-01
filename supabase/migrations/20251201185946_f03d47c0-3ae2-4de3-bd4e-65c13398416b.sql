-- Extend profiles table to track recommender levels
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS level text DEFAULT 'Newbie';

-- Extend recommendations table for visit tracking
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS visit_reminder_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS visit_checked_at timestamp with time zone;

-- Extend recommendation_feedback table for detailed feedback
ALTER TABLE recommendation_feedback
ADD COLUMN IF NOT EXISTS thumbs_up boolean,
ADD COLUMN IF NOT EXISTS comment text,
ADD COLUMN IF NOT EXISTS photo_urls text[],
ADD COLUMN IF NOT EXISTS points_awarded integer DEFAULT 0;

-- Create function to calculate recommender level based on points
CREATE OR REPLACE FUNCTION public.calculate_recommender_level(total_points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF total_points >= 600 THEN
    RETURN 'Verified Guru';
  ELSIF total_points >= 300 THEN
    RETURN 'Expert';
  ELSIF total_points >= 150 THEN
    RETURN 'Trusted';
  ELSIF total_points >= 50 THEN
    RETURN 'Explorer';
  ELSE
    RETURN 'Newbie';
  END IF;
END;
$$;

-- Create function to update recommender level when points change
CREATE OR REPLACE FUNCTION public.update_recommender_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.level = calculate_recommender_level(NEW.points_total);
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update level when points change
DROP TRIGGER IF EXISTS update_level_on_points_change ON profiles;
CREATE TRIGGER update_level_on_points_change
  BEFORE UPDATE OF points_total ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_recommender_level();

-- Create table to track scheduled visit reminders
CREATE TABLE IF NOT EXISTS visit_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid REFERENCES recommendations(id) ON DELETE CASCADE NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on visit_reminders
ALTER TABLE visit_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders for their own requests
CREATE POLICY "Users can view their own reminders"
ON visit_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recommendations r
    JOIN food_requests fr ON fr.id = r.request_id
    WHERE r.id = visit_reminders.recommendation_id
    AND fr.requester_id = auth.uid()
  )
);

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_visit_reminders_scheduled 
ON visit_reminders(scheduled_for, sent) 
WHERE sent = false;