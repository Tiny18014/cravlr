-- Create user_roles enum and table
CREATE TYPE public.app_role AS ENUM ('requester', 'recommender', 'admin');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create food_requests table
CREATE TABLE IF NOT EXISTS public.food_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_type TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_address TEXT,
  additional_notes TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active requests"
  ON public.food_requests FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create their own requests"
  ON public.food_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own requests"
  ON public.food_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can delete their own requests"
  ON public.food_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.food_requests(id) ON DELETE CASCADE NOT NULL,
  recommender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT,
  notes TEXT,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 1 AND confidence_score <= 5),
  place_id TEXT,
  maps_url TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  awarded_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (request_id, recommender_id, restaurant_name)
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create recommendations"
  ON public.recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recommender_id);

CREATE POLICY "Recommenders can update their recommendations"
  ON public.recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = recommender_id);

-- Create recommendation_feedback table
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type TEXT NOT NULL,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (recommendation_id, user_id)
);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback"
  ON public.recommendation_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create feedback"
  ON public.recommendation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.food_requests(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Create request_user_state table
CREATE TABLE IF NOT EXISTS public.request_user_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.food_requests(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, request_id)
);

ALTER TABLE public.request_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own states"
  ON public.request_user_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own states"
  ON public.request_user_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create business_profiles table
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  default_ticket_value NUMERIC(10,2) DEFAULT 50.00,
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business profiles"
  ON public.business_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own business profile"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create referral_clicks table
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE CASCADE NOT NULL,
  restaurant_name TEXT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  converted BOOLEAN DEFAULT FALSE NOT NULL,
  commission_paid BOOLEAN DEFAULT FALSE NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  visit_confirmed_at TIMESTAMP WITH TIME ZONE,
  conversion_value NUMERIC(10,2)
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view referral clicks"
  ON public.referral_clicks FOR SELECT
  TO authenticated
  USING (true);

-- Create points_events table
CREATE TABLE IF NOT EXISTS public.points_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points events"
  ON public.points_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_food_requests_updated_at
  BEFORE UPDATE ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles table with additional fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_recommender BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_total INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_this_month INTEGER DEFAULT 0;

-- Create RPC function to assign user roles
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id UUID, _role app_role)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;