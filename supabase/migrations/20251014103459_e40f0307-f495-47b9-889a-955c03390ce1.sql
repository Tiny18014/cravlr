-- Add feed posts table for Guru content
CREATE TABLE IF NOT EXISTS public.guru_feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('photo', 'video')),
  content_url text NOT NULL,
  location_name text NOT NULL,
  place_id text,
  caption text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add reactions table
CREATE TABLE IF NOT EXISTS public.guru_content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('map', 'post')),
  content_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'drool', 'fire')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id, reaction_type)
);

-- Add map follows table
CREATE TABLE IF NOT EXISTS public.guru_map_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES guru_maps(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, map_id)
);

-- Add view tracking
ALTER TABLE guru_maps ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Enable RLS
ALTER TABLE guru_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru_content_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru_map_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feed posts
CREATE POLICY "Anyone can view feed posts" ON guru_feed_posts
  FOR SELECT USING (true);

CREATE POLICY "Gurus can create feed posts" ON guru_feed_posts
  FOR INSERT WITH CHECK (
    guru_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND guru_level = true)
  );

CREATE POLICY "Gurus can update own posts" ON guru_feed_posts
  FOR UPDATE USING (guru_id = auth.uid());

CREATE POLICY "Gurus can delete own posts" ON guru_feed_posts
  FOR DELETE USING (guru_id = auth.uid());

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reactions" ON guru_content_reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add reactions" ON guru_content_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions" ON guru_content_reactions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows" ON guru_map_follows
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow maps" ON guru_map_follows
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow maps" ON guru_map_follows
  FOR DELETE USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_feed_posts_guru_id ON guru_feed_posts(guru_id);
CREATE INDEX idx_feed_posts_created_at ON guru_feed_posts(created_at DESC);
CREATE INDEX idx_reactions_content ON guru_content_reactions(content_type, content_id);
CREATE INDEX idx_map_follows_map_id ON guru_map_follows(map_id);

-- Add trigger for updated_at
CREATE TRIGGER update_guru_feed_posts_updated_at
  BEFORE UPDATE ON guru_feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();