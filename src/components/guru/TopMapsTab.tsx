import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Heart, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { NewMapModal } from "@/components/guru/NewMapModal";

interface GuruMap {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  likes_count: number;
  view_count: number;
  created_by: string;
  collaborators: string[];
  created_at: string;
  creator?: {
    display_name: string;
  };
  places?: any[];
}

export function TopMapsTab() {
  const [topMaps, setTopMaps] = useState<GuruMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTopMaps();
  }, []);

  const loadTopMaps = async () => {
    const { data: maps, error } = await supabase
      .from("guru_maps")
      .select(`
        *,
        creator:profiles!created_by(display_name),
        places:guru_map_places(count)
      `)
      .order("likes_count", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading maps:", error);
      toast.error("Failed to load maps");
      return;
    }

    setTopMaps(maps || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading maps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Top Maps This Week</h2>
          <p className="text-muted-foreground">Trending collaborative food maps</p>
        </div>
        <Button onClick={() => setShowNewMapModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Map
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topMaps.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No maps yet. Be the first to create one!
              </p>
            </CardContent>
          </Card>
        ) : (
          topMaps.map((map) => (
            <Card
              key={map.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/guru-lounge/map/${map.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{map.title}</span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    {map.likes_count}
                  </div>
                </CardTitle>
                {map.theme && (
                  <CardDescription className="text-xs bg-primary/10 px-2 py-1 rounded-full w-fit">
                    {map.theme}
                  </CardDescription>
                )}
                {map.description && (
                  <CardDescription className="line-clamp-2">
                    {map.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {map.places?.length || 0} places
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {map.collaborators?.length || 0}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    {map.view_count || 0} views
                  </div>
                  {map.creator?.display_name && (
                    <p className="text-xs text-muted-foreground">
                      By {map.creator.display_name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NewMapModal
        open={showNewMapModal}
        onClose={() => setShowNewMapModal(false)}
        onMapCreated={loadTopMaps}
      />
    </div>
  );
}
