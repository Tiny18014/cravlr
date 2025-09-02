-- Add response_window field to food_requests table
ALTER TABLE public.food_requests 
ADD COLUMN response_window INTEGER NOT NULL DEFAULT 120;

-- Add comment for clarity
COMMENT ON COLUMN public.food_requests.response_window IS 'Response window in minutes (5=Quick, 30=Soon, 120=Extended)';

-- Update the expires_at default to use response_window
ALTER TABLE public.food_requests 
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '1 minute' * 120);

-- Create a function to set expires_at based on response_window
CREATE OR REPLACE FUNCTION public.set_expires_at_from_response_window()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NEW.created_at + INTERVAL '1 minute' * NEW.response_window;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expires_at based on response_window
CREATE TRIGGER set_expires_at_trigger
  BEFORE INSERT ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expires_at_from_response_window();