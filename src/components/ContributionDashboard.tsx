import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, Star, ExternalLink, RotateCcw, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserRecommendation {
  id: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  notes?: string;
  confidence_score: number;
  created_at: string;
  rating?: number;
  price_level?: number;
  maps_url?: string;
  food_requests: {
    id: string;
    food_type: string;
    location_city: string;
    location_state: string;
    status: string;
    expire_at: string;
    profiles: {
      display_name: string;
    };
  };
  status: 'pending' | 'viewed' | 'accepted';
  recommendation_count?: number;
}

export const ContributionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    totalPoints: 0,
    thisMonthPoints: 0,
    conversionBonusesThisMonth: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserRecommendations();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          id,
          restaurant_name,
          restaurant_address,
          restaurant_phone,
          notes,
          confidence_score,
          created_at,
          rating,
          price_level,
          maps_url,
          food_requests!inner (
            id,
            food_type,
            location_city,
            location_state,
            status,
            expire_at,
            profiles!inner (display_name)
          )
        `)
        .eq('recommender_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add status and recommendation count for each
      const enrichedData = await Promise.all(
        (data || []).map(async (rec: any) => {
          if (!rec.request_id) return null;
          
          // Get the request details
          const { data: requestData } = await supabase
            .from('food_requests')
            .select('*')
            .eq('id', rec.request_id)
            .single();
            
          if (!requestData) return null;

          // Get total recommendation count for this request
          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', rec.request_id);

          // Determine status
          let status: 'pending' | 'viewed' | 'accepted' = 'pending';
          if (requestData.status === 'active') {
            status = 'pending';
          } else {
            status = 'viewed';
          }

          return {
            ...rec,
            food_requests: requestData,
            status,
            recommendation_count: count || 0
          };
        })
      );
      
      const filteredData = enrichedData.filter(Boolean);

      setRecommendations(filteredData as any);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points_total, points_this_month')
        .eq('user_id', user?.id)
        .single();

      const { count: totalRecs } = await supabase
        .from('recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('recommender_id', user?.id);

      // Get conversion bonuses from this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: conversionBonuses } = await supabase
        .from('points_events')
        .select('points')
        .eq('user_id', user?.id)
        .eq('type', 'conversion_bonus')
        .gte('created_at', startOfMonth.toISOString());

      const conversionBonusesThisMonth = conversionBonuses?.reduce(
        (sum, bonus) => sum + bonus.points, 
        0
      ) || 0;

      setStats({
        totalRecommendations: totalRecs || 0,
        totalPoints: profile?.points_total || 0,
        thisMonthPoints: profile?.points_this_month || 0,
        conversionBonusesThisMonth
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    switch (status) {
      case 'accepted': return 'bg-green-500 text-white';
      case 'viewed': return 'bg-blue-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'viewed': return 'Viewed';
      default: return 'Pending';
    }
  };

  const canRecommendAgain = (request: UserRecommendation['food_requests']) => {
    const now = new Date();
    const expiresAt = new Date(request.expire_at);
    return request.status === 'active' && expiresAt > now;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalRecommendations}</div>
            <div className="text-sm text-muted-foreground">Total Recommendations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalPoints}</div>
            <div className="text-sm text-muted-foreground">Total Points</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.thisMonthPoints}</div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.conversionBonusesThisMonth}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Award className="h-3 w-3" />
              Conversion Bonuses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">You haven't made any recommendations yet.</p>
              <Button onClick={() => navigate('/browse-requests')}>
                Start Recommending
              </Button>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((rec) => (
            <Card key={rec.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{rec.restaurant_name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      For <span className="font-medium">{rec.food_requests.food_type}</span> 
                      {' '}• Requested by <span className="font-medium">{rec.food_requests.profiles.display_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(rec.status)}>
                      {getStatusText(rec.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Restaurant Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {rec.food_requests.location_city}, {rec.food_requests.location_state}
                    </div>
                    {rec.rating && (
                      <div className="flex items-center text-muted-foreground">
                        <Star className="h-4 w-4 mr-2 fill-yellow-500 text-yellow-500" />
                        {rec.rating.toFixed(1)}
                      </div>
                    )}
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatDate(rec.created_at)}
                    </div>
                    <div className="text-muted-foreground">
                      {rec.recommendation_count}/10 total recommendations
                    </div>
                  </div>

                  {/* Notes */}
                  {rec.notes && (
                    <div className="text-sm bg-muted/50 p-3 rounded-lg">
                      <span className="font-medium">Your note:</span> {rec.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      {rec.maps_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={rec.maps_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Maps
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {canRecommendAgain(rec.food_requests) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/recommend/${rec.food_requests.id}`)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Recommend Again
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};