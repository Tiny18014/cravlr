import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Trophy } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardGuru {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points_total: number;
  map_count: number;
  approval_rate: number;
}

export function GuruLeaderboard() {
  const [gurus, setGurus] = useState<LeaderboardGuru[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, points_total, approval_rate")
      .eq("guru_level", true)
      .order("points_total", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading leaderboard:", error);
      toast.error("Failed to load leaderboard");
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

    setGurus(gurusWithCounts);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Guru Leaderboard</h2>
        <p className="text-muted-foreground">Top contributors ranked by points and maps</p>
      </div>

      <div className="grid gap-4">
        {gurus.map((guru, index) => (
          <Card key={guru.user_id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl font-bold text-muted-foreground w-8">
                    {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                    {index === 1 && <Trophy className="h-6 w-6 text-gray-400" />}
                    {index === 2 && <Trophy className="h-6 w-6 text-amber-600" />}
                    {index > 2 && `#${index + 1}`}
                  </div>

                  <Avatar className="h-12 w-12">
                    <AvatarImage src={guru.avatar_url || undefined} />
                    <AvatarFallback>
                      {guru.display_name?.[0]?.toUpperCase() || "G"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-semibold">{guru.display_name || "Anonymous Guru"}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {guru.map_count} maps
                      </div>
                      <div>
                        {guru.approval_rate?.toFixed(0)}% approval
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {guru.points_total.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {gurus.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No gurus found yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
