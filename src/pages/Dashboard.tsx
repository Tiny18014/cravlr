import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Star, TrendingUp, FileText, Clock3, MessageCircle, Award } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardBottomNav } from '@/components/DashboardBottomNav';

interface FoodRequest {
  id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  location_address?: string;
  status: string;
  created_at: string;
  expire_at: string;
  recommendation_count?: number;
}

interface Recommendation {
  id: string;
  restaurant_name: string;
  restaurant_address?: string;
  notes?: string;
  confidence_score: number;
  created_at: string;
  food_requests?: {
    food_type: string;
  };
}

interface ReceivedRecommendation {
  id: string;
  restaurant_name: string;
  profiles?: {
    display_name: string;
  } | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myRecommendations, setMyRecommendations] = useState<Recommendation[]>([]);
  const [receivedRecommendations, setReceivedRecommendations] = useState<ReceivedRecommendation[]>([]);
  const [userPoints, setUserPoints] = useState({ total: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch requests with recommendation counts
      const { data: requests, error: requestsError } = await supabase
        .from('food_requests')
        .select('*, recommendations(count)')
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setMyRequests(requests?.map(req => ({
        ...req,
        recommendation_count: req.recommendations?.[0]?.count || 0
      })) || []);

      // Fetch recommendations made
      const { data: recommendations, error: recError } = await supabase
        .from('recommendations')
        .select('*, food_requests(food_type)')
        .eq('recommender_id', user?.id)
        .order('created_at', { ascending: false });

      if (recError) throw recError;
      setMyRecommendations(recommendations || []);

      // Fetch recommendations received - count only
      const { data: receivedCount, error: receivedError } = await supabase
        .from('recommendations')
        .select('id, restaurant_name, food_requests!inner(requester_id)')
        .eq('food_requests.requester_id', user?.id);

      if (receivedError) {
        console.error('Error fetching received recommendations:', receivedError);
      }
      setReceivedRecommendations(receivedCount || []);

      // Fetch user points
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, points_this_month')
        .eq('id', user?.id)
        .maybeSingle();

      if (profile) {
        setUserPoints({
          total: profile.total_points || 0,
          thisMonth: profile.points_this_month || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/[0.02] to-background flex items-center justify-center">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  const now = new Date();
  const activeRequests = myRequests.filter(req => 
    req.status === 'active' && new Date(req.expire_at) > now
  );
  const expiredRequests = myRequests.filter(req => 
    req.status === 'expired' || req.status === 'closed' || 
    (req.status === 'active' && new Date(req.expire_at) <= now)
  );
  const recentRequests = myRequests.slice(0, 5);
  const recentRecommendations = myRecommendations.slice(0, 5);

  // Render My Requests Tab
  if (activeTab === 'requests') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-background pb-20">
        <DashboardHeader 
          onSignOut={signOut} 
          userName={user?.email?.split('@')[0] || "User"} 
        />

        <main className="flex-1 px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground">My Requests</h1>
            <Button 
              variant="default"
              onClick={() => navigate('/request-food')}
            >
              + New Request
            </Button>
          </div>

          {myRequests.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No requests yet</p>
                <Button onClick={() => navigate('/request-food')}>
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 pb-4">
              {myRequests.map((request) => {
                const isExpired = request.status === 'expired' || request.status === 'closed' || 
                  (request.status === 'active' && new Date(request.expire_at) <= now);
                
                return (
                  <Card key={request.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {request.food_type}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {request.location_city}, {request.location_state}
                            </div>
                          </div>
                          <Badge 
                            variant={isExpired ? "secondary" : "default"}
                            className={isExpired ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}
                          >
                            {isExpired ? 'Expired' : 'Active'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-primary" />
                              <span>{request.recommendation_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Expires {formatDate(request.expire_at)}</span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/requests/${request.id}/results`)}
                            className="text-primary h-7 px-3 hover:bg-primary/10"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        <DashboardBottomNav />
      </div>
    );
  }

  // Render My Recommendations Tab
  if (activeTab === 'recommendations') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-background pb-20">
        <DashboardHeader 
          onSignOut={signOut} 
          userName={user?.email?.split('@')[0] || "User"} 
        />

        <main className="flex-1 px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground">My Recommendations</h1>
            <Button 
              variant="default"
              onClick={() => navigate('/browse-requests')}
            >
              Browse Requests
            </Button>
          </div>

          {myRecommendations.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-12">
                <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No recommendations yet</p>
                <Button onClick={() => navigate('/browse-requests')}>
                  Start Recommending
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 pb-4">
              {myRecommendations.map((rec) => (
                <Card key={rec.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-foreground mb-1">
                            {rec.restaurant_name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            For: {rec.food_requests?.food_type || 'Unknown request'}
                          </p>
                          {rec.restaurant_address && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {rec.restaurant_address}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary flex-shrink-0">
                          <Star className="h-4 w-4 fill-primary" />
                          <span className="text-sm font-semibold">{rec.confidence_score}/5</span>
                        </div>
                      </div>
                      
                      {rec.notes && (
                        <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 line-clamp-2">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <DashboardBottomNav />
      </div>
    );
  }

  // Render Overview Dashboard (default)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-background pb-20">
      <DashboardHeader 
        onSignOut={signOut} 
        userName={user?.email?.split('@')[0] || "User"} 
      />

      <main className="flex-1 px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Craving Insights</h1>
          <p className="text-sm text-muted-foreground">
            Your food requests, recommendations, and activity in one place.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{userPoints.total}</p>
                  <p className="text-xs text-muted-foreground">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{activeRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Active Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                  <Clock3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{expiredRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Expired Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{receivedRecommendations.length}</p>
                  <p className="text-xs text-muted-foreground">Recommendations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Requests</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard?tab=requests')}
              className="text-primary hover:text-primary-dark"
            >
              View All
            </Button>
          </div>

          {recentRequests.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No requests yet</p>
                <Button onClick={() => navigate('/request-food')}>
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => {
                const isExpired = request.status === 'expired' || request.status === 'closed' || 
                  (request.status === 'active' && new Date(request.expire_at) <= now);
                
                return (
                  <Card key={request.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {request.food_type}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {request.location_city}, {request.location_state}
                            </div>
                          </div>
                          <Badge 
                            variant={isExpired ? "secondary" : "default"}
                            className={isExpired ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}
                          >
                            {isExpired ? 'Expired' : 'Active'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-primary" />
                              <span>{request.recommendation_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Expires {formatDate(request.expire_at)}</span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/request-results/${request.id}`)}
                            className="text-primary h-7 px-3 hover:bg-primary/10"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* My Recommendations Section */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">My Recommendations</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard?tab=recommendations')}
              className="text-primary hover:text-primary-dark"
            >
              View All
            </Button>
          </div>

          {recentRecommendations.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-12">
                <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No recommendations yet</p>
                <Button onClick={() => navigate('/browse-requests')}>
                  Start Recommending
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRecommendations.map((rec) => (
                <Card key={rec.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-foreground mb-1">
                            {rec.restaurant_name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            For: {rec.food_requests?.food_type || 'Unknown request'}
                          </p>
                          {rec.restaurant_address && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {rec.restaurant_address}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary flex-shrink-0">
                          <Star className="h-4 w-4 fill-primary" />
                          <span className="text-sm font-semibold">{rec.confidence_score}/5</span>
                        </div>
                      </div>
                      
                      {rec.notes && (
                        <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 line-clamp-2">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <DashboardBottomNav />
    </div>
  );
};

export default Dashboard;
