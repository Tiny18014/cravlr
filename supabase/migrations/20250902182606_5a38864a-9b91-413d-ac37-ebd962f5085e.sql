-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('requester', 'recommender', 'both');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('active', 'completed', 'expired');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  user_role user_role NOT NULL DEFAULT 'both',
  location_city TEXT,
  location_state TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create food requests table
CREATE TABLE public.food_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  food_type TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  additional_notes TEXT,
  status request_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommendations table
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  recommender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT,
  restaurant_phone TEXT,
  notes TEXT,
  confidence_score INTEGER NOT NULL DEFAULT 5 CHECK (confidence_score >= 1 AND confidence_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, recommender_id, restaurant_name)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for food requests
CREATE POLICY "Anyone can view active requests" 
ON public.food_requests 
FOR SELECT 
USING (status = 'active' OR requester_id = auth.uid());

CREATE POLICY "Users can create their own requests" 
ON public.food_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own requests" 
ON public.food_requests 
FOR UPDATE 
USING (auth.uid() = requester_id);

-- Create RLS policies for recommendations
CREATE POLICY "Anyone can view recommendations for active requests" 
ON public.recommendations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.food_requests 
    WHERE id = request_id 
    AND (status = 'active' OR requester_id = auth.uid())
  )
);

CREATE POLICY "Users can create recommendations" 
ON public.recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = recommender_id);

CREATE POLICY "Users can update their own recommendations" 
ON public.recommendations 
FOR UPDATE 
USING (auth.uid() = recommender_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_requests_updated_at
  BEFORE UPDATE ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_food_requests_location ON public.food_requests(location_city, location_state);
CREATE INDEX idx_food_requests_status ON public.food_requests(status);
CREATE INDEX idx_food_requests_expires_at ON public.food_requests(expires_at);
CREATE INDEX idx_recommendations_request_id ON public.recommendations(request_id);

-- Enable realtime for live updates
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;
ALTER TABLE public.recommendations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;