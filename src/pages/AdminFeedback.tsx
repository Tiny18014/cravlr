import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Star, MessageSquare, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

interface FeedbackEntry {
  id: string;
  user_id: string;
  role: string;
  rating: number;
  experience_tags: string[];
  feedback_text: string;
  source_action: string;
  created_at: string;
}

interface FeedbackStats {
  totalCount: number;
  avgRating: number;
  requesterCount: number;
  recommenderCount: number;
  tagDistribution: Record<string, number>;
}

const AdminFeedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      toast.error("Please log in");
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_admin) {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
      return;
    }

    fetchFeedback();
  };

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("app_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFeedback(data || []);
      setFilteredFeedback(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: FeedbackEntry[]) => {
    const totalCount = data.length;
    const avgRating = data.reduce((sum, f) => sum + (f.rating || 0), 0) / totalCount || 0;
    const requesterCount = data.filter((f) => f.role === "requester").length;
    const recommenderCount = data.filter((f) => f.role === "recommender").length;

    const tagDistribution: Record<string, number> = {};
    data.forEach((f) => {
      f.experience_tags?.forEach((tag) => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });

    setStats({
      totalCount,
      avgRating,
      requesterCount,
      recommenderCount,
      tagDistribution,
    });
  };

  useEffect(() => {
    let filtered = feedback;

    if (roleFilter !== "all") {
      filtered = filtered.filter((f) => f.role === roleFilter);
    }

    if (ratingFilter !== "all") {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter((f) => f.rating === rating);
    }

    setFilteredFeedback(filtered);
    calculateStats(filtered);
  }, [roleFilter, ratingFilter, feedback]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">App Feedback Dashboard</h1>
            <p className="text-muted-foreground">View and analyze user feedback</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgRating.toFixed(1) || 0} / 5</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requesters</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.requesterCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recommenders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.recommenderCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="requester">Requester</SelectItem>
              <SelectItem value="recommender">Recommender</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feedback List */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Feedback List</TabsTrigger>
            <TabsTrigger value="tags">Tag Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-6">
            {filteredFeedback.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No feedback found</p>
                </CardContent>
              </Card>
            ) : (
              filteredFeedback.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.role === "requester" ? "default" : "secondary"}>
                              {item.role}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            User ID: {item.user_id.substring(0, 8)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < item.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      {item.experience_tags && item.experience_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.experience_tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Feedback Text */}
                      {item.feedback_text && (
                        <p className="text-sm bg-muted p-3 rounded-md">{item.feedback_text}</p>
                      )}

                      {/* Source */}
                      <p className="text-xs text-muted-foreground">
                        Source: {item.source_action}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tags" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Experience Tag Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.keys(stats.tagDistribution).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.tagDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([tag, count]) => (
                        <div key={tag} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{tag}</span>
                            <span className="text-sm text-muted-foreground">{count} mentions</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2"
                              style={{
                                width: `${(count / stats.totalCount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No tags to display</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminFeedback;
