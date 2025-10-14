import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

interface GuruProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  map_count: number;
}

export function BrowseMapsTab() {
  const [gurus, setGurus] = useState<GuruProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadGurus();
  }, []);

  const loadGurus = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .eq("guru_level", true);

    if (error) {
      console.error("Error loading gurus:", error);
      toast.error("Failed to load gurus");
      return;
    }

    // Get map counts for each guru
    const gurusWithCounts = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count } = await supabase
          .from("guru_maps")
          .select("*", { count: "exact", head: true })
          .eq("created_by", profile.user_id);

        return {
          ...profile,
          map_count: count || 0,
        };
      })
    );

    setGurus(gurusWithCounts.filter(g => g.map_count > 0));
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading gurus...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Browse Maps by Guru</h2>
        <p className="text-muted-foreground">Explore curated collections from top contributors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gurus.map((guru) => (
          <Card key={guru.user_id}>
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={guru.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {guru.display_name?.[0]?.toUpperCase() || "G"}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold text-lg">
                  {guru.display_name || "Anonymous Guru"}
                </h3>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  {guru.map_count} {guru.map_count === 1 ? "map" : "maps"}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // For now, navigate to guru lounge
                  // Could create a guru profile page later
                  toast.info("Guru profile pages coming soon!");
                }}
              >
                View Maps
              </Button>
            </CardContent>
          </Card>
        ))}

        {gurus.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No gurus with maps yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
