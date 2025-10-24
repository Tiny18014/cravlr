import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Droplet, Flame, Award, MapPin, MessageCircle, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SaveToMapModal } from "./SaveToMapModal";

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

interface GuruFeedCardProps {
  post: FeedPost;
  onReaction: (postId: string, reactionType: string) => void;
  onComment?: (postId: string, content: string) => void;
}

export function GuruFeedCard({ post, onReaction, onComment }: GuruFeedCardProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const handleComment = () => {
    if (commentText.trim() && onComment) {
      onComment(post.id, commentText);
      setCommentText("");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.location_name,
          text: post.caption || `Check out ${post.location_name}!`,
          url: window.location.href
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-lg border-border/50 animate-fade-in">
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
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-1">
                  {post.tags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
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
        <div className="relative bg-muted group">
          <img
            src={post.content_url}
            alt={post.location_name}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ maxHeight: '600px' }}
          />
        </div>

        {/* Reactions Row */}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2 border-y border-border/50">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => onReaction(post.id, "heart")}
                className="flex items-center gap-1.5 text-sm font-semibold hover:text-red-500 transition-colors group"
              >
                <Heart className="h-5 w-5 group-hover:fill-red-500 group-hover:scale-110 transition-all" />
                <span>{post.reactions?.heart || 0}</span>
              </button>
              <button
                onClick={() => onReaction(post.id, "drool")}
                className="flex items-center gap-1.5 text-sm font-semibold hover:text-blue-500 transition-colors group"
              >
                <Droplet className="h-5 w-5 group-hover:fill-blue-500 group-hover:scale-110 transition-all" />
                <span>{post.reactions?.drool || 0}</span>
              </button>
              <button
                onClick={() => onReaction(post.id, "fire")}
                className="flex items-center gap-1.5 text-sm font-semibold hover:text-orange-500 transition-colors group"
              >
                <Flame className="h-5 w-5 group-hover:fill-orange-500 group-hover:scale-110 transition-all" />
                <span>{post.reactions?.fire || 0}</span>
              </button>
              <button
                onClick={() => onReaction(post.id, "guru_pick")}
                className="flex items-center gap-1.5 text-sm font-semibold hover:text-purple-500 transition-colors group"
              >
                <Award className="h-5 w-5 group-hover:fill-purple-500 group-hover:scale-110 transition-all" />
                <span>{post.reactions?.guru_pick || 0}</span>
              </button>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveModal(true)}
              className="flex-1"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Save to Map
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Comment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="space-y-3 pt-3 border-t border-border/50">
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-2">
                  {post.comments.slice(0, 2).map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <span className="font-semibold">{comment.guru?.display_name}</span>
                      {" "}
                      <span className="text-foreground/80">{comment.content}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  className="flex-1"
                />
                <Button onClick={handleComment} size="sm">
                  Post
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SaveToMapModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        postId={post.id}
        locationName={post.location_name}
        placeId={post.place_id}
      />
    </>
  );
}
