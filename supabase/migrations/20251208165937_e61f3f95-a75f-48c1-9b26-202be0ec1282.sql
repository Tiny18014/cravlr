-- Create locations table with full administrative hierarchy
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  formatted_address TEXT NOT NULL,
  place_label TEXT,
  continent TEXT,
  country_name TEXT,
  country_code TEXT,
  region TEXT,
  county TEXT,
  city TEXT,
  suburb TEXT,
  neighborhood TEXT,
  street TEXT,
  house_number TEXT,
  postal_code TEXT,
  admin_hierarchy JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'google_geocoding',
  raw_provider_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create places table for restaurants/POIs
CREATE TABLE public.places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'google_places',
  provider_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  formatted_address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country_code TEXT,
  city TEXT,
  suburb TEXT,
  neighborhood TEXT,
  types JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC(2,1),
  user_ratings_total INTEGER,
  price_level INTEGER,
  raw_provider_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_place_id)
);

-- Create user_current_locations table
CREATE TABLE public.user_current_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  is_from_gps BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_locations_lat_lng ON public.locations(lat, lng);
CREATE INDEX idx_locations_country_city ON public.locations(country_code, city);
CREATE INDEX idx_places_provider_place_id ON public.places(provider, provider_place_id);
CREATE INDEX idx_places_lat_lng ON public.places(lat, lng);
CREATE INDEX idx_places_name ON public.places USING gin(to_tsvector('english', name));
CREATE INDEX idx_user_current_locations_user_id ON public.user_current_locations(user_id);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_current_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations (read-only for authenticated users)
CREATE POLICY "Authenticated users can view locations"
ON public.locations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert locations"
ON public.locations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update locations"
ON public.locations FOR UPDATE
USING (true);

-- RLS policies for places (read-only for authenticated users)
CREATE POLICY "Authenticated users can view places"
ON public.places FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert places"
ON public.places FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update places"
ON public.places FOR UPDATE
USING (true);

-- RLS policies for user_current_locations
CREATE POLICY "Users can view their own current location"
ON public.user_current_locations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own current location"
ON public.user_current_locations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own current location"
ON public.user_current_locations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own current location"
ON public.user_current_locations FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_places_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_current_locations_updated_at
BEFORE UPDATE ON public.user_current_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();