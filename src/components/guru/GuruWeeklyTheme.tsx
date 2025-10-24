import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface WeeklyTheme {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
}

export function GuruWeeklyTheme() {
  const [theme, setTheme] = useState<WeeklyTheme | null>(null);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const { data } = await supabase
      .from("guru_weekly_themes")
      .select("*")
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString().split('T')[0])
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setTheme(data);
  };

  if (!theme) return null;

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-4xl animate-pulse">{theme.emoji || "🌟"}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-lg">Weekly Theme</h3>
          </div>
          <p className="text-2xl font-bold mt-1">{theme.title}</p>
          {theme.description && (
            <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
