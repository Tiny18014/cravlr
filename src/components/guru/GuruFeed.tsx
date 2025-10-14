import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Flame, Droplet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface FeedPost {
  id: string;
  guru_id: string;
  content_url: string;
  location_name: string;
  caption: string | null;
  tags: string[] | null;
  created_at: string;
  guru?: {
    display_name: string;
    avatar_url: string | null;
  };
  reactions?: {
    heart: number;
    drool: number;
    fire: number;
  };
}

export function GuruFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    const { data, error } = await supabase
      .from("guru_feed_posts")
      .select(`
        *,
        guru:profiles!guru_id(display_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading feed:", error);
      toast.error("Failed to load feed");
      return;
    }

    // Load reaction counts for each post
    const postsWithReactions = await Promise.all(
      (data || []).map(async (post) => {
        const { data: reactions } = await supabase
          .from("guru_content_reactions")
          .select("reaction_type")
          .eq("content_type", "post")
          .eq("content_id", post.id);

        const reactionCounts = {
          heart: reactions?.filter(r => r.reaction_type === "heart").length || 0,
          drool: reactions?.filter(r => r.reaction_type === "drool").length || 0,
          fire: reactions?.filter(r => r.reaction_type === "fire").length || 0,
        };

        return { ...post, reactions: reactionCounts };
      })
    );

    setPosts(postsWithReactions);
    setLoading(false);
  };

  const toggleReaction = async (postId: string, reactionType: 'heart' | 'drool' | 'fire') => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("guru_content_reactions")
      .select()
      .eq("user_id", user.id)
      .eq("content_type", "post")
      .eq("content_id", postId)
      .eq("reaction_type", reactionType)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("guru_content_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      await supabase
        .from("guru_content_reactions")
        .insert({
          user_id: user.id,
          content_type: "post",
          content_id: postId,
          reaction_type: reactionType,
        });
    }

    loadFeed();
  };

  if (loading) {
    return <div className="text-center py-8">Loading feed...</div>;
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No posts yet. Be the first to share your food discoveries!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          <div className="aspect-square relative">
            <img
              src={post.content_url}
              alt={post.location_name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold">{post.location_name}</h3>
              {post.caption && (
                <p className="text-sm text-muted-foreground mt-1">{post.caption}</p>
              )}
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-primary/10 px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t">
              <button
                onClick={() => toggleReaction(post.id, "heart")}
                className="flex items-center gap-1 text-sm hover:text-red-500 transition-colors"
              >
                <Heart className="h-4 w-4" />
                {post.reactions?.heart || 0}
              </button>
              <button
                onClick={() => toggleReaction(post.id, "drool")}
                className="flex items-center gap-1 text-sm hover:text-blue-500 transition-colors"
              >
                <Droplet className="h-4 w-4" />
                {post.reactions?.drool || 0}
              </button>
              <button
                onClick={() => toggleReaction(post.id, "fire")}
                className="flex items-center gap-1 text-sm hover:text-orange-500 transition-colors"
              >
                <Flame className="h-4 w-4" />
                {post.reactions?.fire || 0}
              </button>
            </div>

            {post.guru && (
              <p className="text-xs text-muted-foreground">
                by {post.guru.display_name}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
