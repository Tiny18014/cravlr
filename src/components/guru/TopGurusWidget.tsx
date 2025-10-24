import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface TopGuru {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points_this_month: number;
}

export function TopGurusWidget() {
  const [topGurus, setTopGurus] = useState<TopGuru[]>([]);

  useEffect(() => {
    loadTopGurus();
  }, []);

  const loadTopGurus = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, points_this_month")
      .eq("guru_level", true)
      .order("points_this_month", { ascending: false })
      .limit(5);

    if (data) setTopGurus(data);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Top Gurus This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topGurus.map((guru, index) => (
          <div key={guru.user_id} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
              {index + 1}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
              {guru.display_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{guru.display_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {guru.points_this_month} pts
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
