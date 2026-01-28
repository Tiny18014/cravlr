import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '@/components/CountdownTimer';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { useToast } from '@/hooks/use-toast';

interface FoodRequest {
  id: string;
  requester_id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  status: string;
  created_at: string;
  expire_at: string;
  lat?: number;
  lng?: number;
  profiles: {
    display_name: string;
  };
  recommendation_count?: number;
  user_has_recommended?: boolean;
  user_state?: "accepted" | "ignored" | null;
}

// Haversine distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Skeleton loading component
const BrowseRequestsSkeleton = React.memo(() => (
  <div className="min-h-screen bg-background pb-20">
    <div className="px-4 sm:px-6 pt-8 pb-5 border-b border-border/50">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-12 w-full rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  </div>
));
BrowseRequestsSkeleton.displayName = 'BrowseRequestsSkeleton';

// Memoized ActionRow component
const ActionRow = React.memo(({ 
  request, 
  userId, 
  onOpenSuggestion,
  handleRequestAction
}: { 
  request: FoodRequest; 
  userId: string | undefined; 
  onOpenSuggestion: (req: FoodRequest) => void;
  handleRequestAction: (id: string, action: string) => void;
}) => {
  const navigate = useNavigate();
  
  const role = request.requester_id === userId ? 'requester' : 'recommender';
  const is_full = (request.recommendation_count || 0) >= 10;
  const now = Date.now();
  const expiresAt = new Date(request.expire_at).getTime();
  const time_left = expiresAt - now;
  const expired = time_left <= 0;
  const inactive = request.status !== 'active' || is_full || expired;

  if (role === 'requester') {
    const buttonText = request.status === 'active' 
      ? `View recommendations (${request.recommendation_count || 0})`
      : 'View final recommendations';
    
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate(`/requests/${request.id}/results`)}
      >
        {buttonText}
      </Button>
    );
  }

  if (inactive) {
    if (is_full) return <Badge variant="secondary">Already Full</Badge>;
    if (expired) return <Badge variant="secondary">Expired</Badge>;
    return <Badge variant="secondary">Closed</Badge>;
  }

  if (request.user_has_recommended) {
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✅ Already Suggested</Badge>;
  }

  if (request.user_state === 'ignored') {
    return <Badge variant="secondary" className="text-muted-foreground">Ignored</Badge>;
  }

  if (request.user_state === 'accepted' && !request.user_has_recommended) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 justify-center">
          You Accepted
        </Badge>
        <Button 
          size="sm"
          onClick={() => onOpenSuggestion(request)}
          className="w-full sm:w-auto"
        >
          <Send className="h-4 w-4 mr-2" />
          Suggest Now
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleRequestAction(request.id, 'ignore')}
        className="text-muted-foreground hover:text-foreground flex-1 sm:flex-none"
      >
        Ignore
      </Button>
      <Button
        size="sm"
        onClick={() => handleRequestAction(request.id, 'accept')}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-none"
      >
        Accept
      </Button>
    </div>
  );
});
ActionRow.displayName = 'ActionRow';

// Memoized RequestCard component
const RequestCard = React.memo(({ 
  request, 
  userId,
  onOpenSuggestion,
  handleRequestAction 
}: { 
  request: FoodRequest;
  userId: string | undefined;
  onOpenSuggestion: (req: FoodRequest) => void;
  handleRequestAction: (id: string, action: string) => void;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">{request.food_type}</h3>
          <div className="flex items-center gap-2">
            <CountdownTimer expiresAt={request.expire_at} />
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Requested by {request.profiles?.display_name || 'Anonymous'}
          </p>
          <div className="flex items-center text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            {request.location_city}, {request.location_state}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {request.recommendation_count}/10 locals suggested
            </Badge>
            {(request.recommendation_count || 0) > 0 && (
              <Badge variant="secondary" className="text-xs">
                🔥 {request.recommendation_count} vote{request.recommendation_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="w-full sm:w-auto">
            <ActionRow 
              request={request} 
              userId={userId}
              onOpenSuggestion={onOpenSuggestion}
              handleRequestAction={handleRequestAction}
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));
RequestCard.displayName = 'RequestCard';

const BrowseRequests = () => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived user data from profile context
  const userName = useMemo(() => 
    profile?.display_name || user?.email?.split('@')[0] || 'User',
    [profile?.display_name, user?.email]
  );

  const userLocation = useMemo(() => ({
    city: profile?.location_city || null,
    state: profile?.location_state || null,
    lat: profile?.profile_lat || null,
    lng: profile?.profile_lng || null,
    radiusKm: profile?.notification_radius_km || 20
  }), [profile]);

  // Fetch requests when profile is loaded
  useEffect(() => {
    if (user && profile) {
      fetchRequests();
    }
  }, [user, profile]);

  // Realtime subscription for new requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('browse-requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests'
        },
        (payload) => {
          // Only refresh if it's not the current user's request
          if (payload.new && (payload.new as any).requester_id !== user.id) {
            fetchRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // If user has no location set, show empty state
      if (!userLocation.city && !userLocation.lat) {
        setRequests([]);
        setLoading(false);
        return;
      }
      
      const now = new Date().toISOString();
      
      // PERFORMANCE FIX: Single optimized query instead of N+1 pattern
      const { data: requestsData, error: requestsError } = await supabase
        .from('food_requests')
        .select('*')
        .eq('status', 'active')
        .neq('requester_id', user.id)
        .gt('expire_at', now)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Filter by location
      const locationFilteredData = (requestsData || []).filter(request => {
        if (userLocation.lat && userLocation.lng && request.lat && request.lng) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            request.lat,
            request.lng
          );
          return distance <= userLocation.radiusKm;
        }
        
        if (userLocation.city) {
          return request.location_city?.toLowerCase() === userLocation.city.toLowerCase();
        }
        
        return false;
      });

      if (locationFilteredData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get all request IDs and requester IDs for batch queries
      const requestIds = locationFilteredData.map(r => r.id);
      const requesterIds = [...new Set(locationFilteredData.map(r => r.requester_id))];

      // PERFORMANCE FIX: Batch fetch all related data in parallel
      const [profilesResult, recommendationCounts, userRecommendations, userStates] = await Promise.all([
        // Get all requester profiles at once
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', requesterIds),
        
        // Get recommendation counts for all requests at once
        supabase
          .from('recommendations')
          .select('request_id')
          .in('request_id', requestIds),
        
        // Get user's recommendations for all requests at once
        supabase
          .from('recommendations')
          .select('request_id')
          .in('request_id', requestIds)
          .eq('recommender_id', user.id),
        
        // Get user's states for all requests at once
        supabase
          .from('request_user_state')
          .select('request_id, state')
          .in('request_id', requestIds)
          .eq('user_id', user.id)
      ]);

      // Create lookup maps for O(1) access
      const profileMap = new Map<string, string>();
      (profilesResult.data || []).forEach(p => {
        profileMap.set(p.id, p.display_name || 'Anonymous');
      });

      const countMap = new Map<string, number>();
      (recommendationCounts.data || []).forEach(rec => {
        countMap.set(rec.request_id, (countMap.get(rec.request_id) || 0) + 1);
      });

      const userRecSet = new Set(
        (userRecommendations.data || []).map(r => r.request_id)
      );

      const stateMap = new Map<string, "accepted" | "ignored">();
      (userStates.data || []).forEach(s => {
        stateMap.set(s.request_id, s.state as "accepted" | "ignored");
      });

      // Enrich requests with the batch-fetched data
      const enrichedRequests: FoodRequest[] = locationFilteredData.map(request => ({
        ...request,
        profiles: { display_name: profileMap.get(request.requester_id) || 'Anonymous' },
        recommendation_count: countMap.get(request.id) || 0,
        user_has_recommended: userRecSet.has(request.id),
        user_state: stateMap.get(request.id) || null
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userLocation]);

  const handleRequestAction = useCallback(async (id: string, action: string) => {
    try {
      const response = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId: id, action }
      });

      if (response.error) {
        throw response.error;
      }

      setRequests(prev => prev.map(req => 
        req.id === id 
          ? { ...req, user_state: (action === 'accept' ? 'accepted' : 'ignored') as "accepted" | "ignored" }
          : req
      ));
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('expired')) {
        toast({
          title: "Request expired",
          description: "This request is no longer available.",
          variant: "destructive"
        });
        setRequests(prev => prev.filter(req => req.id !== id));
      } else {
        toast({
          title: "Error",
          description: `Failed to ${action} request. Please try again.`,
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  const onOpenSuggestion = useCallback((request: FoodRequest) => {
    navigate(`/recommend/${request.id}`);
  }, [navigate]);

  if (!user) return null;

  if (loading) {
    return <BrowseRequestsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <DashboardHeader 
        onSignOut={signOut} 
        userName={userName}
        profileImageUrl={profile?.profile_image_url}
        profileImageUpdatedAt={profile?.profile_image_updated_at}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <NotificationPermissionBanner className="mb-6" />
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Requests Near You 🍽️</h1>
            <p className="text-muted-foreground">Tap a request to share your favorite spot.</p>
          </div>

          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {userLocation.city || userLocation.lat 
                ? `${requests.length} active request${requests.length !== 1 ? 's' : ''} in your area`
                : "Set your location to see nearby requests"
              }
            </p>
          </div>

          {!userLocation.city && !userLocation.lat ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">📍</div>
                <p className="text-muted-foreground mb-2">Set your location to see requests in your area.</p>
                <p className="text-sm text-muted-foreground mb-4">Update your profile with your city to start helping locals.</p>
                <Button onClick={() => navigate('/profile')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Set My Location
                </Button>
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-muted-foreground mb-2">No food requests in {userLocation.city || 'your area'} right now.</p>
                <p className="text-sm text-muted-foreground">Check back later to help food lovers nearby.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <RequestCard 
                  key={request.id}
                  request={request}
                  userId={user?.id}
                  onOpenSuggestion={onOpenSuggestion}
                  handleRequestAction={handleRequestAction}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BrowseRequests;
