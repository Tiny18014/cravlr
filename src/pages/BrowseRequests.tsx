import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEventSource } from '@/hooks/useEventSource';
import { ArrowLeft, MapPin, Clock, Send, Check, ChevronsUpDown, Star, ExternalLink, Phone, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviews?: number;
  priceLevel?: number;
  mapsUrl: string;
  photoToken?: string;
  distanceMeters?: number;
}

interface AutocompleteResult {
  placeId: string;
  name: string;
  address: string;
  description: string;
}

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
  closed_at?: string;
  response_window: number;
  profiles: {
    display_name: string;
    email: string;
  };
  recommendation_count?: number;
  user_has_recommended?: boolean;
  // Real-time specific fields
  lat?: number;
  lng?: number;
  urgency?: "quick" | "soon" | "extended";
}

type LiveEvent = 
  | { type: "hello" | "heartbeat"; serverTime: string }
  | { type: "request.created" | "request.updated" | "request.closed" | "recommendation.created"; requestId: string; serverTime: string; payload: any };

const BrowseRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Record<string, FoodRequest>>({});
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<FoodRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(false);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [googlePlaces, setGooglePlaces] = useState<PlaceResult[]>([]);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [clockSkew, setClockSkew] = useState(0);
  const [formData, setFormData] = useState({
    restaurantName: '',
    note: '',
    link: '',
    placeId: '',
    mapsUrl: '',
    photoToken: '',
    rating: null as number | null,
    priceLevel: null as number | null
  });

  // Get user location once on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => setCoords({ 
        lat: position.coords.latitude, 
        lng: position.coords.longitude 
      }),
      (error) => {
        console.warn('Failed to get location:', error);
        // Fallback to a default location (Concord, NC)
        setCoords({ lat: 35.4087, lng: -80.5792 });
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (coords) {
      fetchInitialRequests();
    }
  }, [user, navigate, coords]);

  const fetchInitialRequests = async () => {
    try {
      // Fetch active requests with recommendation counts and user's recommendation status
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          profiles (display_name, email)
        `)
        .eq('status', 'active')
        .gt('expires_at', 'now()')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each request, get recommendation count and check if user has recommended
      const requestsWithCounts = await Promise.all(
        (data || []).map(async (request) => {
          // Get recommendation count
          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', request.id);

          // Check if current user has already recommended
          let userHasRecommended = false;
          if (user) {
            const { data: userRec } = await supabase
              .from('recommendations')
              .select('id')
              .eq('request_id', request.id)
              .eq('recommender_id', user.id)
              .single();
            userHasRecommended = !!userRec;
          }

          return {
            ...request,
            recommendation_count: count || 0,
            user_has_recommended: userHasRecommended,
            urgency: getUrgencyFromResponseWindow(request.response_window)
          };
        })
      );

      // Convert to record keyed by id
      const requestsRecord: Record<string, FoodRequest> = {};
      requestsWithCounts.forEach(req => {
        requestsRecord[req.id] = req;
      });

      setRequests(requestsRecord);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load food requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Polling fallback for when SSE fails
  const pollForUpdates = useCallback(async () => {
    if (!coords || !user) return;
    
    console.log('🔄 Polling for request updates...');
    
    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          profiles (display_name, email)
        `)
        .eq('status', 'active')
        .gt('expires_at', 'now()')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📥 Found ${data?.length || 0} active requests`);

      const requestsWithCounts = await Promise.all(
        (data || []).map(async (request) => {
          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', request.id);

          let userHasRecommended = false;
          if (user) {
            const { data: userRec } = await supabase
              .from('recommendations')
              .select('id')
              .eq('request_id', request.id)
              .eq('recommender_id', user.id)
              .single();
            userHasRecommended = !!userRec;
          }

          return {
            ...request,
            recommendation_count: count || 0,
            user_has_recommended: userHasRecommended,
            urgency: getUrgencyFromResponseWindow(request.response_window)
          };
        })
      );

      // Update requests state - check for changes
      const newRequestsRecord: Record<string, FoodRequest> = {};
      requestsWithCounts.forEach(req => {
        newRequestsRecord[req.id] = req;
      });
      
      // Log changes
      const currentIds = Object.keys(requests);
      const newIds = Object.keys(newRequestsRecord);
      const addedIds = newIds.filter(id => !currentIds.includes(id));
      const removedIds = currentIds.filter(id => !newIds.includes(id));
      
      if (addedIds.length > 0) {
        console.log('🆕 New requests found:', addedIds);
      }
      if (removedIds.length > 0) {
        console.log('🗑️ Requests removed:', removedIds);
      }
      
      setRequests(newRequestsRecord);
      
    } catch (error) {
      console.error('❌ Error polling for updates:', error);
    }
  }, [coords, user, requests]);

  // Real-time SSE stream URL
  const streamUrl = useMemo(() => {
    if (!coords || !user) return "";

    const params = new URLSearchParams({
      userId: user.id,
      lat: String(coords.lat),
      lng: String(coords.lng),
      radiusKm: "15"
    });
    
    return `https://edazolwepxbdeniluamf.supabase.co/functions/v1/realtime-requests?${params}`;
  }, [coords, user]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((event: LiveEvent) => {
    console.log('Received real-time event:', event);
    
    switch (event.type) {
      case "hello":
        console.log('Connected to real-time stream');
        break;
        
      case "heartbeat":
        // Sync clock for accurate countdowns
        const serverTime = new Date(event.serverTime).getTime();
        const clientTime = Date.now();
        setClockSkew(serverTime - clientTime);
        break;
        
      case "request.created": {
        const payload = event.payload;
        const newRequest: FoodRequest = {
          id: event.requestId,
          food_type: payload.cuisine,
          location_city: payload.area.split(',')[0]?.trim() || '',
          location_state: payload.area.split(',')[1]?.trim() || '',
          created_at: payload.createdAt,
          expires_at: payload.expiresAt,
          response_window: payload.responseWindow,
          status: 'active',
          recommendation_count: payload.count,
          user_has_recommended: false,
          urgency: payload.urgency,
          lat: payload.lat,
          lng: payload.lng,
          profiles: {
            display_name: 'Anonymous',
            email: ''
          }
        };
        
        setRequests(prev => ({ ...prev, [event.requestId]: newRequest }));
        
        // Play sound/vibration for urgent requests
        if (payload.urgency === 'quick') {
          // Optional: play notification sound
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        }
        break;
      }
      
      case "request.updated": {
        const payload = event.payload;
        setRequests(prev => {
          const existing = prev[event.requestId];
          if (!existing) return prev;
          
          return {
            ...prev,
            [event.requestId]: { ...existing, ...payload }
          };
        });
        break;
      }
      
      case "recommendation.created": {
        setRequests(prev => {
          const existing = prev[event.requestId];
          if (!existing) return prev;
          
          return {
            ...prev,
            [event.requestId]: { 
              ...existing, 
              recommendation_count: event.payload.count 
            }
          };
        });
        break;
      }
      
      case "request.closed": {
        setRequests(prev => {
          const next = { ...prev };
          delete next[event.requestId];
          return next;
        });
        break;
      }
    }
  }, []);

  // Set up real-time connection with improved polling
  const { connected, usingFallback } = useEventSource(
    "", // Disable SSE for now, use polling only
    {
      onEvent: handleRealtimeEvent,
      onError: (error) => {
        console.error('Connection error:', error);
      },
      fallbackPoll: pollForUpdates
    }
  );

  // Auto-remove expired requests every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() + clockSkew;
      setRequests(prev => {
        const next = { ...prev };
        let hasChanges = false;
        
        for (const [id, request] of Object.entries(next)) {
          const expiresAt = new Date(request.expires_at).getTime();
          if (expiresAt <= now) {
            delete next[id];
            hasChanges = true;
          }
        }
        
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [clockSkew]);

  const searchPlaces = async (query: string, request: FoodRequest) => {
    if (!query.trim() || query.length < 2) {
      setAutocompleteResults([]);
      setGooglePlaces([]);
      return;
    }

    setSearchingPlaces(true);
    try {
      // Use the autocomplete endpoint for type-ahead suggestions
      const response = await supabase.functions.invoke('places-search/autocomplete', {
        body: {
          input: query.trim(),
          zip: `${request.location_city}, ${request.location_state}`,
          radiusKm: 5
        }
      });

      if (response.error) throw response.error;
      
      const predictions = response.data || [];
      setAutocompleteResults(predictions);
      
      // Clear the full places list during autocomplete
      setGooglePlaces([]);
      
    } catch (error) {
      console.error('Error searching places:', error);
      setAutocompleteResults([]);
      setGooglePlaces([]);
    } finally {
      setSearchingPlaces(false);
    }
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    setSelectedPlace(place);
    setFormData(prev => ({
      ...prev,
      restaurantName: place.name,
      placeId: place.placeId,
      mapsUrl: place.mapsUrl,
      photoToken: place.photoToken || '',
      rating: place.rating || null,
      priceLevel: place.priceLevel || null
    }));
    setRestaurantOpen(false);
  };

  const handleSubmitRecommendation = async () => {
    if (!selectedRequest || !user || !formData.restaurantName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .insert([{
          request_id: selectedRequest.id,
          recommender_id: user.id,
          restaurant_name: formData.restaurantName.trim(),
          notes: formData.note.trim() || null,
          restaurant_address: selectedPlace?.address || null,
          restaurant_phone: null,
          confidence_score: 5,
          place_id: formData.placeId || null,
          maps_url: formData.mapsUrl || null,
          photo_token: formData.photoToken || null,
          rating: formData.rating,
          price_level: formData.priceLevel
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notification email
      console.log('📧 Sending notification email for recommendation:', data.id);
      try {
        const emailResult = await supabase.functions.invoke('send-notification', {
          body: {
            requestId: selectedRequest.id,
            recommendationId: data.id
          }
        });
        console.log('✅ Email notification sent successfully:', emailResult);
      } catch (emailError) {
        console.error('❌ Error sending notification email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Success!",
        description: "Your recommendation has been submitted",
      });

      // Reset form and close dialog
      setFormData({ 
        restaurantName: '', 
        note: '', 
        link: '',
        placeId: '',
        mapsUrl: '',
        photoToken: '',
        rating: null,
        priceLevel: null
      });
      setSelectedPlace(null);
      setGooglePlaces([]);
      setSelectedRequest(null);
      
      // Refresh the requests list
      fetchInitialRequests();
    } catch (error: any) {
      console.error('Error submitting recommendation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit recommendation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  const formatTimeRemaining = (expiresAt: string) => {
    const now = Date.now() + clockSkew;
    const expires = new Date(expiresAt).getTime();
    const diffMs = expires - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMs <= 0) return "Expired";
    
    // For requests with less than 5 minutes, show seconds
    if (diffMins < 5) {
      const mm = String(diffMins).padStart(2, '0');
      const ss = String(Math.max(0, diffSecs)).padStart(2, '0');
      return `${mm}:${ss}`;
    }
    
    if (diffMins < 60) return `${diffMins}m left`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m left`;
  };

  const getUrgencyFromResponseWindow = (responseWindow: number): "quick" | "soon" | "extended" => {
    if (responseWindow <= 5) return "quick";
    if (responseWindow <= 30) return "soon";
    return "extended";
  };

  const getUrgencyColor = (urgency: string, expiresAt: string) => {
    const now = Date.now() + clockSkew;
    const expires = new Date(expiresAt).getTime();
    const diffMs = expires - now;
    
    if (diffMs <= 0) return "secondary"; // Expired
    
    if (urgency === "quick") return "destructive"; // Quick - Red
    if (urgency === "soon") return "outline"; // Soon - Orange  
    return "secondary"; // Extended - Gray
  };

  const getUrgencyText = (urgency: string) => {
    if (urgency === "quick") return "Quick";
    if (urgency === "soon") return "Soon";
    return "Extended";
  };

  const getUrgencyStyle = (urgency: string, expiresAt: string) => {
    const now = Date.now() + clockSkew;
    const expires = new Date(expiresAt).getTime();
    const diffMs = expires - now;
    
    if (diffMs <= 0) return {}; // Expired - default
    
    if (urgency === "quick") return {}; // Quick - Red (destructive variant)
    if (urgency === "soon") return { 
      backgroundColor: '#fb923340', 
      borderColor: '#fb923360', 
      color: '#ea580c' 
    }; // Soon - Orange
    return {}; // Extended - Gray (secondary variant)
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading requests...</div>
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
          <h1 className="text-2xl font-bold">Nearby Requests</h1>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                {usingFallback ? "Live polling (5s)" : "Live updates"}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-orange-500" />
                Connecting...
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Help Fellow Food Lovers!</h2>
            <p className="text-muted-foreground">
              Share your favorite restaurants and earn points for quick responses
            </p>
          </div>

          <div className="space-y-4">
            {!coords && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Getting your location for nearby requests...</p>
                </CardContent>
              </Card>
            )}
            
            {coords && Object.keys(requests).length === 0 && !loading && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No active food requests found nearby.</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {connected ? "Checking for new requests every 5 seconds..." : "Connection issues - trying to reconnect"}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {Object.values(requests)
              .sort((a, b) => {
                // Sort by urgency first (quick > soon > extended), then by creation time
                const urgencyOrder = { quick: 0, soon: 1, extended: 2 };
                const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 2;
                const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 2;
                
                if (aUrgency !== bUrgency) return aUrgency - bUrgency;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{request.food_type}</CardTitle>
                        <div className="flex items-center gap-2">
                          <LiveCountdownBadge 
                            urgency={request.urgency || getUrgencyFromResponseWindow(request.response_window)}
                            expiresAt={request.expires_at}
                            clockSkew={clockSkew}
                          />
                          {request.recommendation_count! >= 10 && (
                            <Badge variant="destructive">Full</Badge>
                          )}
                        </div>
                      </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by {request.profiles.display_name || request.profiles.email}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {request.location_city}, {request.location_state}
                        {request.location_address && ` - ${request.location_address}`}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        Created {formatDate(request.created_at)}
                      </div>
                      {request.additional_notes && (
                        <p className="text-sm mt-2">{request.additional_notes}</p>
                      )}
                      <div className="flex justify-between items-center pt-4">
                        <div className="text-sm text-muted-foreground">
                          {request.recommendation_count}/10 recommendations
                        </div>
                        {request.user_has_recommended ? (
                          <Badge variant="outline">Already suggested</Badge>
                        ) : (
                          <Dialog open={selectedRequest?.id === request.id} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                disabled={request.recommendation_count! >= 10}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Suggest Spot
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Suggest a Restaurant</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="text-sm text-muted-foreground mb-4">
                                  Suggesting for: <strong>{request.food_type}</strong> in {request.location_city}, {request.location_state}
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="restaurantName">Restaurant Name *</Label>
                                  <Popover open={restaurantOpen} onOpenChange={setRestaurantOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={restaurantOpen}
                                        className="w-full justify-between"
                                      >
                                        {formData.restaurantName || "Search for restaurants..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                      <Command>
                                        <CommandInput 
                                          placeholder="Search restaurants..." 
                                          value={formData.restaurantName}
                                          onValueChange={(value) => {
                                            setFormData(prev => ({...prev, restaurantName: value}));
                                            if (selectedRequest) {
                                              searchPlaces(value, selectedRequest);
                                            }
                                          }}
                                        />
                                         <CommandList>
                                           {searchingPlaces && (
                                             <div className="p-2 text-sm text-muted-foreground">
                                               Searching restaurants...
                                             </div>
                                           )}
                                           {!searchingPlaces && autocompleteResults.length === 0 && formData.restaurantName.length >= 2 && (
                                             <CommandEmpty>
                                               No restaurants found. You can still type a custom name.
                                             </CommandEmpty>
                                           )}
                                           {autocompleteResults.length > 0 && (
                                             <CommandGroup heading="Restaurant Suggestions">
                                               {autocompleteResults.map((place) => (
                                                 <CommandItem
                                                   key={place.placeId}
                                                   value={place.name}
                                                   onSelect={() => {
                                                     setFormData(prev => ({
                                                       ...prev,
                                                       restaurantName: place.name,
                                                       placeId: place.placeId
                                                     }));
                                                     setRestaurantOpen(false);
                                                   }}
                                                   className="flex flex-col items-start p-3"
                                                 >
                                                   <div className="flex items-center justify-between w-full">
                                                     <div className="flex items-center gap-2">
                                                       <Check
                                                         className={`h-4 w-4 ${
                                                           formData.restaurantName === place.name ? "opacity-100" : "opacity-0"
                                                         }`}
                                                       />
                                                       <span className="font-medium">{place.name}</span>
                                                     </div>
                                                   </div>
                                                   <div className="text-xs text-muted-foreground mt-1">
                                                     {place.address}
                                                   </div>
                                                 </CommandItem>
                                               ))}
                                             </CommandGroup>
                                           )}
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  {selectedPlace && (
                                    <div className="mt-2 p-3 bg-muted rounded-md">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">{selectedPlace.name}</span>
                                        </div>
                                        {selectedPlace.mapsUrl && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(selectedPlace.mapsUrl, '_blank')}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">{selectedPlace.address}</p>
                                      <div className="flex items-center gap-4 mt-2 text-xs">
                                        {selectedPlace.rating && (
                                          <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            <span>{selectedPlace.rating}</span>
                                            {selectedPlace.reviews && (
                                              <span className="text-muted-foreground">({selectedPlace.reviews})</span>
                                            )}
                                          </div>
                                        )}
                                        {selectedPlace.priceLevel && (
                                          <span className="text-muted-foreground">
                                            {'$'.repeat(selectedPlace.priceLevel)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="note">Note (optional)</Label>
                                  <Textarea
                                    id="note"
                                    placeholder="Why do you recommend this place?"
                                    value={formData.note}
                                    onChange={(e) => setFormData(prev => ({...prev, note: e.target.value}))}
                                    maxLength={140}
                                    rows={3}
                                  />
                                  <div className="text-xs text-muted-foreground text-right">
                                    {formData.note.length}/140
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="link">Link (optional)</Label>
                                  <Input
                                    id="link"
                                    placeholder="Link to maps, website, etc."
                                    value={formData.link}
                                    onChange={(e) => setFormData(prev => ({...prev, link: e.target.value}))}
                                    type="url"
                                  />
                                </div>

                                <div className="flex gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRequest(null);
                                      setFormData({ 
                                        restaurantName: '', 
                                        note: '', 
                                        link: '',
                                        placeId: '',
                                        mapsUrl: '',
                                        photoToken: '',
                                        rating: null,
                                        priceLevel: null
                                      });
                                      setSelectedPlace(null);
                                      setGooglePlaces([]);
                                    }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleSubmitRecommendation}
                                    disabled={!formData.restaurantName.trim() || isSubmitting}
                                    className="flex-1"
                                  >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                 </Card>
               ))
            }
          </div>
        </div>
      </main>
    </div>
  );
};

// Live countdown badge component
const LiveCountdownBadge = ({ urgency, expiresAt, clockSkew }: { 
  urgency: string; 
  expiresAt: string; 
  clockSkew: number; 
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateTime = () => {
      const now = Date.now() + clockSkew;
      const expires = new Date(expiresAt).getTime();
      const diffMs = expires - now;
      
      if (diffMs <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      // For urgent requests (< 5 min), show countdown in MM:SS format
      if (diffMins < 5) {
        const mm = String(diffMins).padStart(2, '0');
        const ss = String(Math.max(0, diffSecs)).padStart(2, '0');
        setTimeLeft(`${mm}:${ss}`);
      } else if (diffMins < 60) {
        setTimeLeft(`${diffMins}m left`);
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setTimeLeft(`${hours}h ${mins}m left`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, clockSkew]);
  
  const getVariant = () => {
    if (timeLeft === 'Expired') return 'secondary';
    if (urgency === 'quick') return 'destructive';
    if (urgency === 'soon') return 'outline';
    return 'secondary';
  };
  
  const getStyle = () => {
    if (timeLeft === 'Expired') return {};
    if (urgency === 'quick') return {};
    if (urgency === 'soon') return {
      backgroundColor: '#fb923340',
      borderColor: '#fb923360',
      color: '#ea580c'
    };
    return {};
  };
  
  const getUrgencyDisplayText = () => {
    if (urgency === 'quick') return 'Quick';
    if (urgency === 'soon') return 'Soon';
    return 'Extended';
  };
  
  return (
    <Badge 
      variant={getVariant()}
      style={getStyle()}
      className={urgency === 'quick' && timeLeft !== 'Expired' ? 'animate-pulse' : ''}
    >
      {getUrgencyDisplayText()} — {timeLeft}
    </Badge>
  );
};

export default BrowseRequests;