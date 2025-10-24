import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MapPin, Plus, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SaveToMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  locationName: string;
  placeId?: string | null;
}

interface GuruMap {
  id: string;
  title: string;
  description: string | null;
  isSaved: boolean;
}

export function SaveToMapModal({ open, onOpenChange, postId, locationName, placeId }: SaveToMapModalProps) {
  const { user } = useAuth();
  const [maps, setMaps] = useState<GuruMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [showNewMap, setShowNewMap] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadMaps();
    }
  }, [open, user]);

  const loadMaps = async () => {
    if (!user) return;

    const { data: mapsData } = await supabase
      .from("guru_maps")
      .select("id, title, description")
      .or(`created_by.eq.${user.id},collaborators.cs.{${user.id}}`)
      .order("created_at", { ascending: false });

    if (!mapsData) return;

    // Check which maps already have this post saved
    const { data: saves } = await supabase
      .from("guru_post_saves")
      .select("map_id")
      .eq("post_id", postId);

    const savedMapIds = new Set(saves?.map(s => s.map_id) || []);

    setMaps(mapsData.map(map => ({
      ...map,
      isSaved: savedMapIds.has(map.id)
    })));
  };

  const toggleSave = async (mapId: string) => {
    if (!user) return;

    const map = maps.find(m => m.id === mapId);
    if (!map) return;

    setLoading(true);

    if (map.isSaved) {
      const { error } = await supabase
        .from("guru_post_saves")
        .delete()
        .eq("post_id", postId)
        .eq("map_id", mapId);

      if (error) {
        toast.error("Failed to remove from map");
      } else {
        toast.success("Removed from map");
        setMaps(maps.map(m => m.id === mapId ? { ...m, isSaved: false } : m));
      }
    } else {
      const { error } = await supabase
        .from("guru_post_saves")
        .insert({
          post_id: postId,
          map_id: mapId,
          saved_by: user.id
        });

      if (error) {
        toast.error("Failed to save to map");
      } else {
        toast.success("Saved to map!");
        setMaps(maps.map(m => m.id === mapId ? { ...m, isSaved: true } : m));
      }
    }

    setLoading(false);
  };

  const createNewMap = async () => {
    if (!user || !newMapName.trim()) return;

    setLoading(true);

    const { data: newMap, error } = await supabase
      .from("guru_maps")
      .insert({
        title: newMapName,
        created_by: user.id,
        is_public: true
      })
      .select()
      .single();

    if (error || !newMap) {
      toast.error("Failed to create map");
      setLoading(false);
      return;
    }

    // Save post to new map
    await supabase
      .from("guru_post_saves")
      .insert({
        post_id: postId,
        map_id: newMap.id,
        saved_by: user.id
      });

    toast.success("Map created and post saved!");
    setNewMapName("");
    setShowNewMap(false);
    loadMaps();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Save "{locationName}" to Map
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showNewMap ? (
            <>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {maps.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => toggleSave(map.id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium">{map.title}</p>
                        {map.description && (
                          <p className="text-xs text-muted-foreground">{map.description}</p>
                        )}
                      </div>
                      {map.isSaved && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewMap(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Map
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Map name (e.g., Best Tacos in LA)"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createNewMap()}
              />
              <div className="flex gap-2">
                <Button
                  onClick={createNewMap}
                  disabled={!newMapName.trim() || loading}
                  className="flex-1"
                >
                  Create & Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewMap(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
