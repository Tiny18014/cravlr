import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { GuruWeeklyTheme } from "./GuruWeeklyTheme";
import { GuruFilterBar } from "./GuruFilterBar";
import { GuruFeedCard } from "./GuruFeedCard";
import { TopGurusWidget } from "./TopGurusWidget";

interface FeedPost {
  id: string;
  guru_id: string;
  content_url: string;
  location_name: string;
  caption: string | null;
  tags: string[] | null;
  created_at: string;
  place_id?: string | null;
  guru?: {
    display_name: string;
    avatar_url: string | null;
  };
  reactions?: {
    heart: number;
    drool: number;
    fire: number;
    guru_pick: number;
  };
  comments?: Array<{
    id: string;
    content: string;
    guru_id: string;
    created_at: string;
    guru?: {
      display_name: string;
    };
  }>;
}

export function GuruFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const POSTS_PER_PAGE = 12;

  useEffect(() => {
    loadFeed();
  }, [selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const loadFeed = async (offset = 0) => {
    const isLoadingMore = offset > 0;
    if (isLoadingMore) {
      setLoadingMore(true);
    }

    let query = supabase
      .from("guru_feed_posts")
      .select(`
        *,
        guru:profiles!guru_id(display_name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    // Apply tag filters
    if (selectedTags.length > 0) {
      query = query.contains("tags", selectedTags);
    }

    const { data, error } = await query.range(offset, offset + POSTS_PER_PAGE - 1);

    if (error) {
      console.error("Error loading feed:", error);
      toast.error("Failed to load feed");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Check if there are more posts
    setHasMore((data || []).length === POSTS_PER_PAGE);

    // Load reaction counts and comments for each post
    const postsWithData = await Promise.all(
      (data || []).map(async (post) => {
        const [reactionsData, commentsData] = await Promise.all([
          supabase
            .from("guru_content_reactions")
            .select("reaction_type")
            .eq("content_type", "post")
            .eq("content_id", post.id),
          supabase
            .from("guru_post_comments")
            .select(`
              id,
              content,
              guru_id,
              created_at
            `)
            .eq("post_id", post.id)
            .order("created_at", { ascending: false })
            .limit(2)
        ]);

        const reactionCounts = {
          heart: reactionsData.data?.filter(r => r.reaction_type === "heart").length || 0,
          drool: reactionsData.data?.filter(r => r.reaction_type === "drool").length || 0,
          fire: reactionsData.data?.filter(r => r.reaction_type === "fire").length || 0,
          guru_pick: reactionsData.data?.filter(r => r.reaction_type === "guru_pick").length || 0,
        };

        // Fetch guru info for comments
        const commentsWithGuru = await Promise.all(
          (commentsData.data || []).map(async (comment) => {
            const { data: guruData } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", comment.guru_id)
              .single();

            return {
              ...comment,
              guru: guruData || undefined
            };
          })
        );

        return { 
          ...post, 
          reactions: reactionCounts,
          comments: commentsWithGuru
        };
      })
    );

    if (isLoadingMore) {
      setPosts(prev => [...prev, ...postsWithData]);
      setLoadingMore(false);
    } else {
      setPosts(postsWithData);
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadFeed(posts.length);
  };

  const handleComment = async (postId: string, content: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("guru_post_comments")
      .insert({
        post_id: postId,
        guru_id: user.id,
        content
      });

    if (error) {
      toast.error("Failed to post comment");
    } else {
      toast.success("Comment posted!");
      loadFeed();
    }
  };

  const toggleReaction = async (postId: string, reactionType: 'heart' | 'drool' | 'fire' | 'guru_pick') => {
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
    <div className="flex gap-6">
      {/* Main Feed Column */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <GuruWeeklyTheme />
          <GuruFilterBar
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />
          
          <div className="max-w-2xl mx-auto space-y-4 pb-6">
            {posts.map((post) => (
              <GuruFeedCard
                key={post.id}
                post={post}
                onReaction={toggleReaction}
                onComment={handleComment}
              />
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center pb-6 max-w-2xl mx-auto">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
                className="w-full"
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
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 space-y-4">
        <TopGurusWidget />
      </div>
    </div>
  );
}
