-- 1. Add Guru level access flag to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS guru_level BOOLEAN DEFAULT FALSE;

-- 2. Create guru_maps table for collaborative map metadata
CREATE TABLE IF NOT EXISTS guru_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  created_by UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  collaborators UUID[] DEFAULT ARRAY[]::UUID[],
  is_public BOOLEAN DEFAULT TRUE,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create guru_map_places table for places within each map
CREATE TABLE IF NOT EXISTS guru_map_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES guru_maps(id) ON DELETE CASCADE NOT NULL,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  added_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  notes TEXT,
  photo_token TEXT,
  rating NUMERIC(2,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create guru_map_likes table for social proof and leaderboard
CREATE TABLE IF NOT EXISTS guru_map_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES guru_maps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(map_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE guru_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru_map_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru_map_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guru_maps
CREATE POLICY "Anyone can view public maps"
ON guru_maps FOR SELECT
USING (is_public = true OR created_by = auth.uid() OR auth.uid() = ANY(collaborators));

CREATE POLICY "Gurus can create maps"
ON guru_maps FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND guru_level = true)
);

CREATE POLICY "Creators and collaborators can update maps"
ON guru_maps FOR UPDATE
USING (created_by = auth.uid() OR auth.uid() = ANY(collaborators));

-- RLS Policies for guru_map_places
CREATE POLICY "Anyone can view places in public maps"
ON guru_map_places FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM guru_maps 
    WHERE guru_maps.id = map_id 
    AND (is_public = true OR created_by = auth.uid() OR auth.uid() = ANY(collaborators))
  )
);

CREATE POLICY "Collaborators can add places"
ON guru_map_places FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guru_maps 
    WHERE guru_maps.id = map_id 
    AND (created_by = auth.uid() OR auth.uid() = ANY(collaborators))
  )
);

CREATE POLICY "Collaborators can update places"
ON guru_map_places FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM guru_maps 
    WHERE guru_maps.id = map_id 
    AND (created_by = auth.uid() OR auth.uid() = ANY(collaborators))
  )
);

CREATE POLICY "Collaborators can delete places"
ON guru_map_places FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM guru_maps 
    WHERE guru_maps.id = map_id 
    AND (created_by = auth.uid() OR auth.uid() = ANY(collaborators))
  )
);

-- RLS Policies for guru_map_likes
CREATE POLICY "Anyone can view likes"
ON guru_map_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like maps"
ON guru_map_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike maps"
ON guru_map_likes FOR DELETE
USING (user_id = auth.uid());

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_map_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE guru_maps SET likes_count = likes_count + 1 WHERE id = NEW.map_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE guru_maps SET likes_count = likes_count - 1 WHERE id = OLD.map_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically update likes count
CREATE TRIGGER update_guru_map_likes_count
AFTER INSERT OR DELETE ON guru_map_likes
FOR EACH ROW EXECUTE FUNCTION update_map_likes_count();

-- Function to update updated_at timestamp
CREATE TRIGGER update_guru_maps_updated_at
BEFORE UPDATE ON guru_maps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();