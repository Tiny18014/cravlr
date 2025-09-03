import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Clock, Star, User } from 'lucide-react';

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
  food_requests: {
    food_type: string;
    location_city: string;
    location_state: string;
  };
  profiles: {
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
  profiles: {
    display_name: string;
  };
  food_requests: {
    food_type: string;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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
      const { data: recommendations, error: recommendationsError } = await supabase
        .from('recommendations')
        .select(`
          *,
          food_requests (food_type, location_city, location_state),
          profiles (display_name)
        `)
        .eq('recommender_id', user?.id)
        .order('created_at', { ascending: false });

      if (recommendationsError) throw recommendationsError;
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
        .select('points_total, points_this_month')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profile) {
        setUserPoints({
          total: profile.points_total || 0,
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Points Header */}
        <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border">
          <h2 className="text-2xl font-bold mb-2">Your Points</h2>
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold text-primary">{userPoints.total}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{userPoints.thisMonth}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests">My Requests ({myRequests.length})</TabsTrigger>
            <TabsTrigger value="given">Given Recommendations ({myRecommendations.length})</TabsTrigger>
            <TabsTrigger value="received">Received Recommendations ({receivedRecommendations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {myRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't made any food requests yet.</p>
                  <Button onClick={() => navigate('/request-food')}>
                    Make Your First Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{request.food_type}</CardTitle>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {request.location_city}, {request.location_state}
                          {request.location_address && ` - ${request.location_address}`}
                        </div>
                        <Badge variant="outline">
                          {request.recommendation_count || 0} recommendations
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        Created {formatDate(request.created_at)} • Expires {formatDate(request.expires_at)}
                      </div>
                      {request.additional_notes && (
                        <p className="text-sm mt-2">{request.additional_notes}</p>
                      )}
                      {(request.recommendation_count || 0) > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/request/${request.id}/results`)}
                          >
                            View {request.recommendation_count} recommendation{request.recommendation_count !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="given" className="space-y-4">
            {myRecommendations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't given any recommendations yet.</p>
                  <Button onClick={() => navigate('/browse-requests')}>
                    Browse Requests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myRecommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{rec.restaurant_name}</CardTitle>
                      <div className="flex items-center">
                        {rec.awarded_points > 0 ? (
                          <Badge variant="secondary">{rec.awarded_points} pts</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        For: {rec.food_requests.food_type} in {rec.food_requests.location_city}, {rec.food_requests.location_state}
                      </p>
                      {rec.restaurant_address && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {rec.restaurant_address}
                        </div>
                      )}
                      {rec.restaurant_phone && (
                        <p className="text-sm text-muted-foreground">📞 {rec.restaurant_phone}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {formatDate(rec.created_at)}
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

          <TabsContent value="received" className="space-y-4">
            {receivedRecommendations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't received any recommendations yet.</p>
                  <Button onClick={() => navigate('/request-food')}>
                    Create a Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              receivedRecommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{rec.restaurant_name}</CardTitle>
                      <div className="flex items-center">
                        {rec.awarded_points > 0 ? (
                          <Badge variant="secondary">{rec.awarded_points} pts</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="h-4 w-4 mr-2" />
                        Recommended by {rec.profiles?.display_name || 'Anonymous'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        For your: {rec.food_requests.food_type} request
                      </p>
                      {rec.restaurant_address && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {rec.restaurant_address}
                        </div>
                      )}
                      {rec.restaurant_phone && (
                        <p className="text-sm text-muted-foreground">📞 {rec.restaurant_phone}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {formatDate(rec.created_at)}
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