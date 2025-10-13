import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Clock, Star, User, LogOut, Bell, BellOff, Sparkles } from 'lucide-react';
import { ReputationBadge } from '@/components/ReputationBadge';
import { useNotifications } from '@/contexts/UnifiedNotificationContext';
import { Switch } from '@/components/ui/switch';
// Timer is now handled globally via UnifiedRequestManager

interface FoodRequest {
  id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  location_address?: string;
  additional_notes?: string;
  status: string;
  created_at: string;
  expires_at: string;
  requester_id: string;
  recommendation_count?: number;
}

interface Recommendation {
  id: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  notes?: string;
  confidence_score: number;
  awarded_points?: number;
  created_at: string;
  request_id: string;
  food_requests?: {
    food_type: string;
    location_city: string;
    location_state: string;
  };
  profiles?: {
    display_name: string;
  };
}

interface ReceivedRecommendation {
  id: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  notes?: string;
  confidence_score: number;
  awarded_points?: number;
  created_at: string;
  profiles?: {
    display_name: string;
  };
  food_requests?: {
    food_type: string;
  };
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { dnd, setDnd } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myRecommendations, setMyRecommendations] = useState<Recommendation[]>([]);
  const [receivedRecommendations, setReceivedRecommendations] = useState<ReceivedRecommendation[]>([]);
  const [userPoints, setUserPoints] = useState({ 
    total: 0, 
    thisMonth: 0,
    reputation_score: 0,
    approval_rate: 0,
    total_feedbacks: 0,
    positive_feedbacks: 0,
    is_admin: false
  });
  const [loading, setLoading] = useState(true);
  const [isGuru, setIsGuru] = useState(false);
  
  // Get the default tab from URL parameter
  const defaultTab = searchParams.get('tab') || 'requests';

  // Timer is now handled globally via UnifiedRequestManager

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchDashboardData();
  }, [user, navigate]);

  // Refresh data when tab becomes visible (user returns from notification)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log("📊 Dashboard tab visible, refreshing data...");
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data for user:', user?.id);
      // Fetch user's requests with recommendation counts
      const { data: requests, error: requestsError } = await supabase
        .from('food_requests')
        .select('*')
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Add recommendation count to each request
      const requestsWithCounts = await Promise.all(
        (requests || []).map(async (request) => {
          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', request.id);
          
          return {
            ...request,
            recommendation_count: count || 0
          };
        })
      );

      setMyRequests(requestsWithCounts);

      // Fetch recommendations user has made
      console.log('🔍 Fetching recommendations for user:', user?.id);
      const { data: recommendations, error: recommendationsError } = await supabase
        .from('recommendations')
        .select(`
          *,
          food_requests (food_type, location_city, location_state),
          profiles (display_name)
        `)
        .eq('recommender_id', user?.id)
        .order('created_at', { ascending: false });

      console.log('📋 Recommendations query result:', { recommendations, error: recommendationsError });
      if (recommendationsError) {
        console.error('❌ Error fetching recommendations:', recommendationsError);
        throw recommendationsError;
      }
      setMyRecommendations(recommendations || []);

      // Fetch recommendations received by user
      const { data: received, error: receivedError } = await supabase
        .from('recommendations')
        .select(`
          *,
          profiles (display_name),
          food_requests!inner (food_type, requester_id)
        `)
        .eq('food_requests.requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;
      setReceivedRecommendations(received || []);

      // Fetch user points
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points_total, points_this_month, reputation_score, approval_rate, total_feedbacks, positive_feedbacks, is_admin, guru_level')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profile) {
        setUserPoints({
          total: profile.points_total || 0,
          thisMonth: profile.points_this_month || 0,
          reputation_score: profile.reputation_score || 0,
          approval_rate: profile.approval_rate || 0,
          total_feedbacks: profile.total_feedbacks || 0,
          positive_feedbacks: profile.positive_feedbacks || 0,
          is_admin: profile.is_admin || false
        });
        setIsGuru(profile.guru_level || false);
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

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : 'bg-gray-500';
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  // Filter requests with client-side expiration check as backup
  const now = new Date();
  const activeRequests = myRequests.filter(req => 
    req.status === 'active' && new Date(req.expires_at) > now
  );
  const expiredRequests = myRequests.filter(req => 
    req.status === 'expired' || req.status === 'closed' || 
    (req.status === 'active' && new Date(req.expires_at) <= now)
  );
  const recentRequests = myRequests.slice(0, 3); // Show only last 3 requests
  const totalRecommendationsReceived = receivedRecommendations.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            {isGuru && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/guru-lounge')}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Guru Lounge
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">Your Food Requests 📝</h1>
              <p className="text-muted-foreground mt-1">Track responses and see recommendations.</p>
            </div>
          </div>
          <Button variant="outline" onClick={async () => {
            console.log('🔘 Sign out button clicked');
            try {
              await signOut();
              console.log('🔄 Navigating to welcome page...');
              navigate('/welcome');
            } catch (error) {
              console.error('❌ Sign out error in component:', error);
              // Force navigation even if sign out fails
              navigate('/welcome');
            }
          }} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Points & Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1">{userPoints.total}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <span>Total Points</span>
                <ReputationBadge 
                  reputationScore={userPoints.reputation_score}
                  approvalRate={userPoints.approval_rate}
                  totalFeedbacks={userPoints.total_feedbacks}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{activeRequests.length}</div>
              <div className="text-sm text-muted-foreground">Active Requests</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-gray-500 mb-1">{expiredRequests.length}</div>
              <div className="text-sm text-muted-foreground">Expired Requests</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{totalRecommendationsReceived}</div>
              <div className="text-sm text-muted-foreground">Recommendations Received</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 flex-wrap items-center">
          <Button onClick={() => navigate('/request-food')} className="flex-1 md:flex-none">
            Request Food
          </Button>
          <Button variant="outline" onClick={() => navigate('/browse-requests')} className="flex-1 md:flex-none">
            Browse Requests
          </Button>
          <Button variant="ghost" onClick={() => navigate('/profile')} className="flex-1 md:flex-none flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </Button>
          {userPoints.is_admin && (
            <Button variant="secondary" onClick={() => navigate('/admin/conversions')} className="flex-1 md:flex-none">
              Admin Panel
            </Button>
          )}
          
          {/* Do Not Disturb Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            {dnd ? (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Bell className="h-4 w-4 text-primary" />
            )}
            <Switch
              id="dnd-toggle"
              checked={!dnd}
              onCheckedChange={(enabled) => {
                console.log("🔄 DND toggle clicked:", !enabled);
                setDnd(!enabled);
              }}
            />
            <span className="text-sm font-medium">
              {dnd ? 'Do Not Disturb' : 'Notifications'}
            </span>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">Recent Requests</TabsTrigger>
            <TabsTrigger value="made">My Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {recentRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-6xl mb-4">🍴</div>
                  <p className="text-muted-foreground mb-2">You haven't created any food requests yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">👉 Tap below to get started!</p>
                  <Button onClick={() => navigate('/request-food')}>
                    Create Food Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {recentRequests.map((request) => {
                  const isExpired = request.status === 'expired' || request.status === 'closed' || 
                    (request.status === 'active' && new Date(request.expires_at) <= now);
                  const statusText = isExpired ? 'Expired' : request.status === 'active' ? 'Active' : 'Closed';
                  const statusColor = isExpired ? 'bg-gray-500' : request.status === 'active' ? 'bg-green-500' : 'bg-gray-500';
                  
                  return (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Food type - big and bold */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold">{request.food_type}</h3>
                            <Badge className={statusColor}>
                              {statusText}
                            </Badge>
                          </div>
                          
                          {/* Location and timing */}
                          <div className="space-y-2">
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="h-4 w-4 mr-2" />
                              {request.location_city}, {request.location_state}
                              {request.location_address && ` - ${request.location_address}`}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 mr-2" />
                              Created {formatDate(request.created_at)} • Expires {formatDate(request.expires_at)}
                            </div>
                          </div>

                          {/* Recommendation counter and action */}
                          <div className="flex justify-between items-center pt-2">
                            <div className="text-sm text-muted-foreground">
                              {request.recommendation_count || 0}/10 recommendations
                            </div>
                            {(request.recommendation_count || 0) > 0 && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => navigate(`/requests/${request.id}/results`)}
                              >
                                View Recommendations
                              </Button>
                            )}
                          </div>
                          
                          {request.additional_notes && (
                            <p className="text-sm text-muted-foreground border-t pt-3">{request.additional_notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {myRequests.length > 3 && (
                  <Card>
                    <CardContent className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Showing 3 of {myRequests.length} requests
                      </p>
                      <Button variant="outline" size="sm">
                        View All Requests
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="made" className="space-y-4">
            {myRecommendations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't made any recommendations yet.</p>
                  <Button onClick={() => navigate('/browse-requests')}>
                    Browse Requests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myRecommendations.slice(0, 5).filter(rec => rec && rec.food_requests).map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{rec.restaurant_name}</CardTitle>
                      <div className="flex items-center">
                        {rec.awarded_points && rec.awarded_points > 0 ? (
                          <Badge variant="secondary">+{rec.awarded_points} pts</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Recommended for: {rec.food_requests?.food_type} request
                      </p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {rec.food_requests?.location_city}, {rec.food_requests?.location_state}
                      </div>
                      {rec.restaurant_address && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          Restaurant: {rec.restaurant_address}
                        </div>
                      )}
                      {rec.restaurant_phone && (
                        <p className="text-sm text-muted-foreground">📞 {rec.restaurant_phone}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        Recommended {formatDate(rec.created_at)}
                      </div>
                      {rec.notes && (
                        <p className="text-sm mt-2">{rec.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;