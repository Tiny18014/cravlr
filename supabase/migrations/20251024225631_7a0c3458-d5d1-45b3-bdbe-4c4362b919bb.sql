-- Add comments table for guru posts
CREATE TABLE IF NOT EXISTS public.guru_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.guru_feed_posts(id) ON DELETE CASCADE,
  guru_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guru_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments" ON public.guru_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Gurus can create comments" ON public.guru_post_comments
  FOR INSERT WITH CHECK (
    guru_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND guru_level = true)
  );

CREATE POLICY "Gurus can update own comments" ON public.guru_post_comments
  FOR UPDATE USING (guru_id = auth.uid());

CREATE POLICY "Gurus can delete own comments" ON public.guru_post_comments
  FOR DELETE USING (guru_id = auth.uid());

-- Add weekly themes table
CREATE TABLE IF NOT EXISTS public.guru_weekly_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guru_weekly_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active themes" ON public.guru_weekly_themes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage themes" ON public.guru_weekly_themes
  FOR ALL USING (is_admin());

-- Add saved posts to maps table
CREATE TABLE IF NOT EXISTS public.guru_post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.guru_feed_posts(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.guru_maps(id) ON DELETE CASCADE,
  saved_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, map_id)
);

-- Enable RLS
ALTER TABLE public.guru_post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post saves" ON public.guru_post_saves
  FOR SELECT USING (true);

CREATE POLICY "Gurus can save posts to their maps" ON public.guru_post_saves
  FOR INSERT WITH CHECK (
    saved_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM guru_maps 
      WHERE id = map_id 
      AND (created_by = auth.uid() OR auth.uid() = ANY(collaborators))
    )
  );

CREATE POLICY "Users can delete their own saves" ON public.guru_post_saves
  FOR DELETE USING (saved_by = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guru_post_comments_post_id ON public.guru_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_guru_post_comments_guru_id ON public.guru_post_comments(guru_id);
CREATE INDEX IF NOT EXISTS idx_guru_weekly_themes_active ON public.guru_weekly_themes(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_guru_post_saves_post_id ON public.guru_post_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_guru_post_saves_map_id ON public.guru_post_saves(map_id);

-- Insert a sample weekly theme
INSERT INTO public.guru_weekly_themes (title, description, emoji, start_date, end_date, is_active)
VALUES (
  'Cozy Soups Week',
  'Share your favorite bowl of comfort! 🍲',
  '🍲',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  true
)
ON CONFLICT DO NOTHING;