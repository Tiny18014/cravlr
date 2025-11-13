-- Fix: Restrict guru_map_likes SELECT to only public maps
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all likes" ON guru_map_likes;

-- Create a more restrictive policy that only allows viewing likes for public maps
CREATE POLICY "Users can view likes for public maps" 
ON guru_map_likes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM guru_maps
    WHERE guru_maps.id = guru_map_likes.map_id
    AND guru_maps.is_public = true
  )
);