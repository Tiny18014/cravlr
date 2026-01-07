import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '@/components/CountdownTimer';
import { ReputationBadge } from '@/components/ReputationBadge';
import { ExitIntentFeedbackTrigger } from '@/components/ExitIntentFeedbackTrigger';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';

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

// ActionRow component implementing your exact spec
const ActionRow = ({ 
  request, 
  user, 
  onOpenSuggestion,
  handleRequestAction
}: { 
  request: FoodRequest; 
  user: any; 
  onOpenSuggestion: (req: FoodRequest) => void;
  handleRequestAction: (id: string, action: string) => void;
}) => {
  const navigate = useNavigate();
  
  // Role detection
  const role = request.requester_id === user?.id ? 'requester' : 'recommender';
  
  // State calculations
  const is_full = (request.recommendation_count || 0) >= 10;
  const now = Date.now();
  const expiresAt = new Date(request.expire_at).getTime();
  const time_left = expiresAt - now;
  const expired = time_left <= 0;
  const inactive = request.status !== 'active' || is_full || expired;

  console.log(`ActionRow for ${request.id}: role=${role}, inactive=${inactive}, is_full=${is_full}, expired=${expired}, user_has_recommended=${request.user_has_recommended}, user_state=${request.user_state}`);

  // Guardrail: Requester view
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

  // Recommender view - following exact spec order
  
  // 1. Inactive states
  if (inactive) {
    if (is_full) return <Badge variant="secondary">Already Full</Badge>;
    if (expired) return <Badge variant="secondary">Expired</Badge>;
    return <Badge variant="secondary">Closed</Badge>;
  }

  // 2. Already recommended - show as status chip
  if (request.user_has_recommended) {
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✅ Already Suggested</Badge>;
  }

  // 3. Ignored state - show as status chip
  if (request.user_state === 'ignored') {
    return <Badge variant="secondary" className="text-muted-foreground">Ignored</Badge>;
  }

  // 4. Accepted but hasn't recommended yet - show status chip + action
  if (request.user_state === 'accepted' && !request.user_has_recommended) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          You Accepted
        </Badge>
        <Button 
          size="sm"
          onClick={() => onOpenSuggestion(request)}
        >
          <Send className="h-4 w-4 mr-2" />
          Suggest Now
        </Button>
      </div>
    );
  }

  // 5. Default state - show Accept/Ignore
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleRequestAction(request.id, 'ignore')}
        className="text-muted-foreground hover:text-foreground"
      >
        Ignore
      </Button>
      <Button
        size="sm"
        onClick={() => handleRequestAction(request.id, 'accept')}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Accept
      </Button>
    </div>
  );
};

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

interface UserLocation {
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
}

const BrowseRequests = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileImageUpdatedAt, setProfileImageUpdatedAt] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Fetch requests only after we have user location
  useEffect(() => {
    if (user && userLocation !== null) {
      fetchRequests();
    }
  }, [user, userLocation]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, location_city, location_state, profile_lat, profile_lng, notification_radius_km, profile_image_url, updated_at')
      .eq('id', user.id)
      .single();
    
    setUserName(profile?.display_name || user.email?.split('@')[0] || 'User');
    setProfileImageUrl(profile?.profile_image_url || null);
    setProfileImageUpdatedAt(profile?.updated_at || null);
    setUserLocation({
      city: profile?.location_city || null,
      state: profile?.location_state || null,
      lat: profile?.profile_lat || null,
      lng: profile?.profile_lng || null,
      radiusKm: profile?.notification_radius_km || 20
    });
  };

  // Add realtime subscription for new requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('browse-requests-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'food_requests'
        },
        (payload) => {
          console.log('🎯 New request created, refreshing list:', payload.new);
          // Only refresh if it's not the current user's request
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
          console.log('🎯 Request updated, refreshing list:', payload.new);
          fetchRequests();
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
      
      // If user has no location set, show empty state
      if (!userLocation?.city && !userLocation?.lat) {
        console.log('🎯 User has no location set, showing empty state');
        setRequests([]);
        setLoading(false);
        return;
      }
      
      // Query for active requests that haven't expired
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('food_requests')
        .select('*')
        .eq('status', 'active')
        .neq('requester_id', user.id)
        .gt('expire_at', now)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by location - geo-based or city-based
      const locationFilteredData = (data || []).filter(request => {
        // Geo-based matching if both user and request have coordinates
        if (userLocation.lat && userLocation.lng && request.lat && request.lng) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            request.lat,
            request.lng
          );
          return distance <= userLocation.radiusKm;
        }
        
        // Fall back to city-based matching
        if (userLocation.city) {
          return request.location_city?.toLowerCase() === userLocation.city.toLowerCase();
        }
        
        return false;
      });

      console.log(`🎯 Fetched ${data?.length || 0} total requests, ${locationFilteredData.length} in user's area`);

      // For each request, get recommendation count, user state, and profile
      const enrichedRequests = await Promise.all(
        locationFilteredData.map(async (request) => {
          // Get requester profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', request.requester_id)
            .maybeSingle();
          // Get recommendation count
          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', request.id);

          // Check if user has already recommended
          const { data: userRec } = await supabase
            .from('recommendations')
            .select('id')
            .eq('request_id', request.id)
            .eq('recommender_id', user.id)
            .single();

          // Get user's state for this request (accepted/ignored)
          const { data: userState } = await supabase
            .from('request_user_state')
            .select('state')
            .eq('request_id', request.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...request,
            profiles: { display_name: profile?.display_name || 'Anonymous' },
            recommendation_count: count || 0,
            user_has_recommended: !!userRec,
            user_state: (userState?.state as "accepted" | "ignored") || null
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (id: string, action: string) => {
    try {
      console.log(`🎯 Action triggered: ${action} on request ${id}`);
      
      // Call the backend to record the accept/ignore action
      const response = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId: id, action }
      });

      console.log('🎯 Backend response:', response);

      // Check if there's an error in the response
      if (response.error) {
        console.error('🎯 Edge function error:', response.error);
        throw response.error;
      }

      // Update local state (match what the edge function stores)
      setRequests(prev => prev.map(req => 
        req.id === id 
          ? { ...req, user_state: (action === 'accept' ? 'accepted' : 'ignored') as "accepted" | "ignored" }
          : req
      ));

      console.log(`✅ Successfully ${action}ed request ${id}`);
    } catch (error) {
      console.error(`❌ Error ${action}ing request:`, error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
      }

      // If it's a FunctionsHttpError, try to get more details
      if (error && typeof error === 'object' && 'context' in error) {
        console.error('❌ Error context:', error.context);
        try {
          const errorText = await (error.context as Response).text();
          console.error('❌ Error response text:', errorText);
        } catch (e) {
          console.error('❌ Could not read error response text:', e);
        }
      }
    }
  };

  const onOpenSuggestion = (request: FoodRequest) => {
    console.log('🎯 Opening suggestion for:', request.id);
    navigate(`/recommend/${request.id}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <DashboardHeader 
        onSignOut={signOut} 
        userName={userName}
        profileImageUrl={profileImageUrl}
        profileImageUpdatedAt={profileImageUpdatedAt}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <NotificationPermissionBanner className="mb-6" />
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Requests Near You 🍽️</h1>
            <p className="text-muted-foreground">Tap a request to share your favorite spot.</p>
          </div>

          {/* Quick summary - only count non-expired requests */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : 
                userLocation?.city || userLocation?.lat 
                  ? `${requests.length} active request${requests.length !== 1 ? 's' : ''} in your area`
                  : "Set your location to see nearby requests"
              }
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading nearby requests...</p>
            </div>
          ) : !userLocation?.city && !userLocation?.lat ? (
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
                <p className="text-muted-foreground mb-2">No food requests in {userLocation?.city || 'your area'} right now.</p>
                <p className="text-sm text-muted-foreground">Check back later to help food lovers nearby.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Food type - big and bold */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold">{request.food_type}</h3>
                        <div className="flex items-center gap-2">
                          <CountdownTimer expiresAt={request.expire_at} />
                        </div>
                      </div>
                      
                      {/* Requester and location */}
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          Requested by {request.profiles?.display_name || 'Anonymous'}
                        </p>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {request.location_city}, {request.location_state}
                        </div>
                      </div>

                       {/* Recommendation count and actions */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {request.recommendation_count}/10 locals suggested
                          </Badge>
                          {request.recommendation_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              🔥 {request.recommendation_count} vote{request.recommendation_count !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <ActionRow 
                          request={request} 
                          user={user} 
                          onOpenSuggestion={onOpenSuggestion}
                          handleRequestAction={handleRequestAction}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <ExitIntentFeedbackTrigger
        role="recommender"
        sourceAction="exit_intent_recommender"
      />
    </div>
  );
};

export default BrowseRequests;