import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Star, TrendingUp, FileText, Clock3, MessageCircle, Award, CheckCircle, XCircle } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardBottomNav } from '@/components/DashboardBottomNav';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';

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
  status: string;
  food_requests?: {
    food_type: string;
  };
}

interface RecommenderNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  restaurant_name: string;
  read: boolean;
  created_at: string;
}

interface ReceivedRecommendation {
  id: string;
  restaurant_name: string;
  profiles?: {
    display_name: string;
  } | null;
}

// Memoized date formatter
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Skeleton loading component for dashboard
const DashboardSkeleton = React.memo(() => (
  <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-background pb-20">
    <div className="px-4 sm:px-6 pt-8 pb-5 border-b border-border/50">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </main>
  </div>
));
DashboardSkeleton.displayName = 'DashboardSkeleton';

// Memoized request card component
const RequestCard = React.memo(({ 
  request, 
  now, 
  onViewClick 
}: { 
  request: FoodRequest; 
  now: Date;
  onViewClick: (id: string) => void;
}) => {
  const isExpired = request.status === 'expired' || request.status === 'closed' || 
    (request.status === 'active' && new Date(request.expire_at) <= now);
  
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
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
              onClick={() => onViewClick(request.id)}
              className="text-primary h-7 px-3 hover:bg-primary/10"
            >
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
RequestCard.displayName = 'RequestCard';

// Memoized recommendation card
const RecommendationCard = React.memo(({ rec }: { rec: Recommendation }) => (
  <Card className="border-border/50 hover:shadow-md transition-shadow">
    <CardContent className="p-3 sm:p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm sm:text-base font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">
                {rec.restaurant_name}
              </h3>
              {rec.status === 'accepted' && (
                <Badge className="bg-green-500 text-white text-[10px] sm:text-xs flex-shrink-0">
                  Accepted
                </Badge>
              )}
              {rec.status === 'declined' && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] sm:text-xs flex-shrink-0">
                  Declined
                </Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              For: {rec.food_requests?.food_type || 'Unknown request'}
            </p>
            {rec.restaurant_address && (
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{rec.restaurant_address}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-primary flex-shrink-0">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-primary" />
            <span className="text-xs sm:text-sm font-semibold">{rec.confidence_score}/5</span>
          </div>
        </div>
        
        {rec.notes && (
          <p className="text-[11px] sm:text-xs text-muted-foreground pt-2 border-t border-border/30 line-clamp-2">
            {rec.notes}
          </p>
        )}
      </div>
    </CardContent>
  </Card>
));
RecommendationCard.displayName = 'RecommendationCard';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myRecommendations, setMyRecommendations] = useState<Recommendation[]>([]);
  const [receivedRecommendations, setReceivedRecommendations] = useState<ReceivedRecommendation[]>([]);
  const [recommenderNotifications, setRecommenderNotifications] = useState<RecommenderNotification[]>([]);
  const [userPoints, setUserPoints] = useState({ total: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  // Use profile from context instead of fetching again
  const displayName = useMemo(() => 
    profile?.display_name || user?.email?.split('@')[0] || 'User',
    [profile?.display_name, user?.email]
  );

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      // PERFORMANCE FIX: Run all queries in parallel instead of sequentially
      const [requestsResult, recommendationsResult, notificationsResult, receivedResult] = await Promise.all([
        // Fetch requests with recommendation counts
        supabase
          .from('food_requests')
          .select('*, recommendations(count)')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false }),
        
        // Fetch recommendations made with status
        supabase
          .from('recommendations')
          .select('id, restaurant_name, restaurant_address, notes, confidence_score, created_at, status, food_requests(food_type)')
          .eq('recommender_id', user.id)
          .order('created_at', { ascending: false }),
        
        // Fetch recommender notifications (unread first)
        supabase
          .from('recommender_notifications')
          .select('*')
          .eq('recommender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Fetch recommendations received - count only
        supabase
          .from('recommendations')
          .select('id, restaurant_name, food_requests!inner(requester_id)')
          .eq('food_requests.requester_id', user.id)
      ]);

      // Process results
      if (requestsResult.error) throw requestsResult.error;
      setMyRequests(requestsResult.data?.map(req => ({
        ...req,
        recommendation_count: req.recommendations?.[0]?.count || 0
      })) || []);

      if (recommendationsResult.error) throw recommendationsResult.error;
      setMyRecommendations(recommendationsResult.data || []);

      if (!notificationsResult.error && notificationsResult.data) {
        setRecommenderNotifications(notificationsResult.data);
      }

      if (!receivedResult.error) {
        setReceivedRecommendations(receivedResult.data || []);
      }

      // Use points from profile context if available, otherwise use defaults
      if (profile) {
        setUserPoints({
          total: profile.points_total || 0,
          thisMonth: 0 // This isn't in UserProfile type, default to 0
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
  }, [user, profile, toast]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('recommender_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setRecommenderNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    }
  }, []);

  const handleViewRequest = useCallback((id: string) => {
    navigate(`/requests/${id}/results`);
  }, [navigate]);

  // Memoize computed values
  const now = useMemo(() => new Date(), []);
  
  const { activeRequests, expiredRequests, recentRequests, recentRecommendations } = useMemo(() => ({
    activeRequests: myRequests.filter(req => 
      req.status === 'active' && new Date(req.expire_at) > now
    ),
    expiredRequests: myRequests.filter(req => 
      req.status === 'expired' || req.status === 'closed' || 
      (req.status === 'active' && new Date(req.expire_at) <= now)
    ),
    recentRequests: myRequests.slice(0, 5),
    recentRecommendations: myRecommendations.slice(0, 5)
  }), [myRequests, myRecommendations, now]);

  const unreadNotifications = useMemo(() => 
    recommenderNotifications.filter(n => !n.read),
    [recommenderNotifications]
  );

  if (!user) return null;

  if (loading || profileLoading) {
    return <DashboardSkeleton />;
  }

  // Render My Requests Tab
  if (activeTab === 'requests') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-background pb-20">
        <DashboardHeader 
          onSignOut={signOut} 
          userName={displayName}
          profileImageUrl={profile?.profile_image_url}
          profileImageUpdatedAt={profile?.profile_image_updated_at}
        />

        <main className="flex-1 px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
          <NotificationPermissionBanner className="mb-4" />
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
              {myRequests.map((request) => (
                <RequestCard 
                  key={request.id} 
                  request={request} 
                  now={now}
                  onViewClick={handleViewRequest}
                />
              ))}
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
          userName={displayName}
          profileImageUrl={profile?.profile_image_url}
          profileImageUpdatedAt={profile?.profile_image_updated_at}
        />

        <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
          <NotificationPermissionBanner className="mb-4" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">My Recommendations</h1>
            <Button 
              variant="default"
              onClick={() => navigate('/browse-requests')}
              className="w-full sm:w-auto"
              size="sm"
            >
              Browse Requests
            </Button>
          </div>

          {/* Notifications for recommenders */}
          {unreadNotifications.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Recent Updates</h2>
              {unreadNotifications.slice(0, 3).map((notif) => (
                <Card 
                  key={notif.id} 
                  className={`border-l-4 cursor-pointer transition-opacity hover:opacity-80 ${notif.type === 'accepted' ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'}`}
                  onClick={() => markNotificationAsRead(notif.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{notif.type === 'accepted' ? '🎉' : '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{notif.restaurant_name}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground flex-shrink-0">
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {myRecommendations.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-8 sm:py-12">
                <Star className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4 text-sm">No recommendations yet</p>
                <Button onClick={() => navigate('/browse-requests')} size="sm">
                  Start Recommending
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 pb-4">
              {myRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
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
        userName={displayName}
        profileImageUrl={profile?.profile_image_url}
        profileImageUpdatedAt={profile?.profile_image_updated_at}
      />

      <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto w-full">
        <NotificationPermissionBanner className="mb-4" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1">Craving Insights</h1>
          <p className="text-muted-foreground text-sm">Track your activity</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Points</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{userPoints.total}</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Active Requests</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{activeRequests.length}</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock3 className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Expired</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{expiredRequests.length}</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Received</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{receivedRecommendations.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Requests</h2>
            {myRequests.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard?tab=requests')}
                className="text-primary"
              >
                View All
              </Button>
            )}
          </div>
          
          {recentRequests.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-8">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm mb-3">No requests yet</p>
                <Button size="sm" onClick={() => navigate('/request-food')}>
                  Create Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((request) => (
                <RequestCard 
                  key={request.id} 
                  request={request} 
                  now={now}
                  onViewClick={handleViewRequest}
                />
              ))}
            </div>
          )}
        </section>

        {/* My Recommendations */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">My Recommendations</h2>
            {myRecommendations.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard?tab=recommendations')}
                className="text-primary"
              >
                View All
              </Button>
            )}
          </div>
          
          {recentRecommendations.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-8">
                <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm mb-3">No recommendations yet</p>
                <Button size="sm" onClick={() => navigate('/browse-requests')}>
                  Browse Requests
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          )}
        </section>
      </main>

      <DashboardBottomNav />
    </div>
  );
};

export default Dashboard;
