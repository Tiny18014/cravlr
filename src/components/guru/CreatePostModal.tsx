import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

const SUGGESTED_TAGS = [
  "Tacos", "Dessert", "Spicy", "Under $10", "Late Night",
  "Vegan", "Pizza", "Noodles", "Coffee", "Burgers", "Brunch",
  "Hidden Gem", "Instagrammable", "Family Friendly", "Date Night"
];

export function CreatePostModal({ open, onOpenChange, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [locationName, setLocationName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!user || !imageFile || !locationName.trim()) {
      toast.error("Please add an image and location name");
      return;
    }

    setLoading(true);

    try {
      // For now, we'll use a placeholder URL since we don't have storage configured
      // In production, you'd upload to Supabase Storage here
      const imageUrl = imagePreview; // Using base64 for demo

      const { error } = await supabase
        .from("guru_feed_posts")
        .insert({
          guru_id: user.id,
          content_url: imageUrl,
          location_name: locationName,
          place_id: placeId || null,
          caption: caption || null,
          tags: selectedTags.length > 0 ? selectedTags : null,
          content_type: "photo"
        });

      if (error) throw error;

      toast.success("Post created! 🎉");
      onPostCreated?.();
      onOpenChange(false);
      
      // Reset form
      setImageFile(null);
      setImagePreview("");
      setLocationName("");
      setPlaceId("");
      setCaption("");
      setSelectedTags([]);
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Photo/Video *</Label>
            {!imagePreview ? (
              <label className="mt-2 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </label>
            ) : (
              <div className="relative mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Location Name */}
          <div>
            <Label htmlFor="location">Location Name *</Label>
            <Input
              id="location"
              placeholder="e.g., Joe's Pizza NYC"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Place ID (optional) */}
          <div>
            <Label htmlFor="placeId">Google Place ID (optional)</Label>
            <Input
              id="placeId"
              placeholder="e.g., ChIJN1t_tDeuEmsRUsoyG83frY4"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Share your experience..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SUGGESTED_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover-scale"
                  onClick={() => toggleTag(tag)}
                >
                  {selectedTags.includes(tag) ? (
                    <X className="h-3 w-3 mr-1" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || !imageFile || !locationName.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Post"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
