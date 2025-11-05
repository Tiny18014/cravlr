import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, Send, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '@/components/CountdownTimer';

interface FoodRequest {
  id: string;
  requester_id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  status: string;
  created_at: string;
  expire_at: string;
  profiles: {
    display_name: string;
  };
  recommendation_count?: number;
  user_has_recommended?: boolean;
  user_state?: "accepted" | "ignored" | null;
}

interface ActiveRequestsListProps {
  limit?: number;
  compact?: boolean;
  showTitle?: boolean;
  title?: string;
}

const ActiveRequestsList = ({ 
  limit = 10, 
  compact = false, 
  showTitle = true,
  title = "Active Food Requests"
}: ActiveRequestsListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  // Add realtime subscription for new requests and recommendations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('active-requests-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'food_requests'
        },
        (payload) => {
          console.log('🎯 New request created, refreshing active list:', payload.new);
          if (payload.new.requester_id !== user.id) {
            fetchRequests();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'food_requests'
        },
        (payload) => {
          console.log('🎯 Request updated, refreshing active list:', payload.new);
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recommendations'
        },
        (payload) => {
          console.log('🎯 New recommendation created, refreshing active list:', payload.new);
          // If the current user created this recommendation, refresh the list to update button states
          if (payload.new.recommender_id === user.id) {
            fetchRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          id,
          requester_id,
          food_type,
          location_city,
          location_state,
          status,
          created_at,
          expire_at
        `)
        .eq('status', 'active')
        .neq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Enrich with recommendation count and user state
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request: any) => {
          // Fetch the profile separately
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', request.requester_id)
            .single();

          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', request.id);

          const { data: userRec } = await supabase
            .from('recommendations')
            .select('id')
            .eq('request_id', request.id)
            .eq('recommender_id', user.id)
            .maybeSingle();

          const { data: userState } = await supabase
            .from('request_user_state')
            .select('state')
            .eq('request_id', request.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...request,
            profiles: profile || { display_name: 'Unknown User' },
            recommendation_count: count || 0,
            user_has_recommended: !!userRec,
            user_state: (userState?.state as "accepted" | "ignored") || null
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching active requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccept = async (requestId: string) => {
    try {
      const response = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId, action: 'accept' }
      });

      if (response.error) throw response.error;

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, user_state: 'accepted' as const }
          : req
      ));

      // Navigate to recommendation form
      navigate(`/recommend/${requestId}`);
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-3">
        {showTitle && <h2 className="text-lg font-semibold">{title}</h2>}
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-3">
        {showTitle && <h2 className="text-lg font-semibold">{title}</h2>}
        <Card>
          <CardContent className="text-center py-6">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm text-muted-foreground">No active requests nearby</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          {compact && requests.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/browse-requests')}
              className="text-primary"
            >
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
      
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {requests.map((request) => {
          const isExpired = new Date(request.expire_at) < new Date();
          const isFull = (request.recommendation_count || 0) >= 10;
          const canRecommend = !isExpired && !isFull && !request.user_has_recommended;

          return (
            <Card key={request.id} className={compact ? "shadow-sm" : ""}>
              <CardContent className={compact ? "p-4" : "p-6"}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={compact ? "text-lg font-semibold" : "text-xl font-bold"}>
                        {request.food_type}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {request.location_city}, {request.location_state}
                      </div>
                    </div>
                    <CountdownTimer expiresAt={request.expire_at} />
                  </div>

                  {/* Status and actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {request.recommendation_count}/10 suggestions
                      </Badge>
                      {request.user_has_recommended && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          ✅ You suggested
                        </Badge>
                      )}
                      {request.user_state === 'accepted' && !request.user_has_recommended && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          Accepted
                        </Badge>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {canRecommend && !request.user_state && (
                        <Button
                          size="sm"
                          onClick={() => handleQuickAccept(request.id)}
                          className="text-xs"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Suggest
                        </Button>
                      )}
                      {request.user_state === 'accepted' && !request.user_has_recommended && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/recommend/${request.id}`)}
                          className="text-xs"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Suggest Now
                        </Button>
                      )}
                      {!compact && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/browse-requests`)}
                          className="text-xs"
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveRequestsList;