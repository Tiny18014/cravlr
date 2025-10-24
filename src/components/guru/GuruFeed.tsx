import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Flame, Droplet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 12;

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async (offset = 0) => {
    const isLoadingMore = offset > 0;
    if (isLoadingMore) {
      setLoadingMore(true);
    }

    const { data, error } = await supabase
      .from("guru_feed_posts")
      .select(`
        *,
        guru:profiles!guru_id(display_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    if (error) {
      console.error("Error loading feed:", error);
      toast.error("Failed to load feed");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Check if there are more posts
    setHasMore((data || []).length === POSTS_PER_PAGE);

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

    if (isLoadingMore) {
      setPosts(prev => [...prev, ...postsWithReactions]);
      setLoadingMore(false);
    } else {
      setPosts(postsWithReactions);
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadFeed(posts.length);
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
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="max-w-2xl mx-auto space-y-4 pb-6">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden rounded-lg border-border/50">
            {/* Post Header */}
            <CardContent className="p-4 pb-0">
              {post.guru && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold">
                      {post.guru.display_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {post.guru.display_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} • {format(new Date(post.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Location & Caption */}
              <div className="mb-3">
                <h3 className="font-bold text-base mb-1">{post.location_name}</h3>
                {post.caption && (
                  <p className="text-sm text-foreground/90 leading-relaxed">{post.caption}</p>
                )}
              </div>
            </CardContent>

            {/* Post Image */}
            <div className="relative bg-muted">
              <img
                src={post.content_url}
                alt={post.location_name}
                className="w-full object-cover"
                style={{ maxHeight: '600px' }}
              />
            </div>

            {/* Reactions & Tags */}
            <CardContent className="p-4 space-y-3">

              {/* Reaction Buttons */}
              <div className="flex items-center gap-6 py-2 border-t border-b border-border/50">
                <button
                  onClick={() => toggleReaction(post.id, "heart")}
                  className="flex items-center gap-2 text-sm font-semibold hover:text-red-500 transition-colors group flex-1 justify-center py-2 rounded-md hover:bg-muted/50"
                >
                  <Heart className="h-5 w-5 group-hover:fill-red-500" />
                  <span>{post.reactions?.heart || 0}</span>
                </button>
                <button
                  onClick={() => toggleReaction(post.id, "drool")}
                  className="flex items-center gap-2 text-sm font-semibold hover:text-blue-500 transition-colors group flex-1 justify-center py-2 rounded-md hover:bg-muted/50"
                >
                  <Droplet className="h-5 w-5 group-hover:fill-blue-500" />
                  <span>{post.reactions?.drool || 0}</span>
                </button>
                <button
                  onClick={() => toggleReaction(post.id, "fire")}
                  className="flex items-center gap-2 text-sm font-semibold hover:text-orange-500 transition-colors group flex-1 justify-center py-2 rounded-md hover:bg-muted/50"
                >
                  <Flame className="h-5 w-5 group-hover:fill-orange-500" />
                  <span>{post.reactions?.fire || 0}</span>
                </button>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center pb-6">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="outline"
            size="lg"
            className="w-full max-w-xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Posts"
            )}
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}
