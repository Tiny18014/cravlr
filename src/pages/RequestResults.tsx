import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ArrowLeft, MapPin, Star, DollarSign, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralLinks } from "@/hooks/useReferralLinks";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AppFeedbackTrigger } from "@/components/AppFeedbackTrigger";
import { ExitIntentFeedbackTrigger } from "@/components/ExitIntentFeedbackTrigger";
import { feedbackSessionManager } from "@/utils/feedbackSessionManager";

interface Note {
  by: string;
  text: string;
}

interface RecommendationGroup {
  key: string;
  name: string;
  placeId?: string;
  rating?: number;
  reviews?: number;
  priceLevel?: number;
  distanceMeters?: number;
  mapsUrl?: string;
  photoToken?: string;
  count: number;
  firstSubmittedAt: string;
  lastSubmittedAt: string;
  notes: Note[];
  recommendationId?: string; // Add for referral tracking
  referralUrl?: string; // Add for referral tracking
  isPremium?: boolean; // Premium business flag
}

interface RequestResultsData {
  requestId: string;
  status: string;
  expiresAt: string;
  totalRecommendations: number;
  groups: RecommendationGroup[];
  hasMore?: boolean;
}

interface FoodRequest {
  id: string;
  requester_id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  expires_at: string;
  status: string;
}

const RequestResults = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<RequestResultsData | null>(null);
  const [request, setRequest] = useState<FoodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [goingIntents, setGoingIntents] = useState<Set<string>>(new Set());
  const [showFeedbackTrigger, setShowFeedbackTrigger] = useState(false);
  const { generateReferralLink } = useReferralLinks();
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackShownRef = useRef<boolean>(false);

  const fetchResults = async () => {
    if (!requestId) {
      console.error("❌ RequestResults: No requestId provided");
      setLoading(false);
      return;
    }

    try {
      console.log("🔍 RequestResults: Fetching results for request:", requestId);
      console.log("🔍 RequestResults: Current user:", user?.id);
      
      // Fetch request details first
      const { data: requestData, error: requestError } = await supabase
        .from('food_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle(); // Use maybeSingle to avoid 404 errors

      if (requestError) {
        console.error('❌ Error fetching request:', requestError);
        setLoading(false);
        return;
      }

      if (!requestData) {
        console.error('❌ RequestResults: Request not found for ID:', requestId);
        setLoading(false);
        return;
      }

      console.log("✅ RequestResults: Found request:", requestData);
      setRequest(requestData);

      // Fetch recommendations with LEFT JOIN to profiles (not requiring profiles to exist)
      const { data: recommendations, error: recError } = await supabase
        .from('recommendations')
        .select(`
          *,
          profiles(display_name)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (recError) {
        console.error('Error fetching recommendations:', recError);
        return;
      }

      console.log("🔍 RequestResults: Found recommendations:", recommendations);

      // Simple aggregation for now - group by restaurant name
      const groups = new Map();
      
      for (const rec of recommendations || []) {
        const key = rec.place_id || rec.restaurant_name.toLowerCase().trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
        
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            name: rec.restaurant_name,
            placeId: rec.place_id,
            mapsUrl: rec.maps_url,
            count: 0,
            firstSubmittedAt: rec.created_at,
            lastSubmittedAt: rec.created_at,
            notes: [],
            rating: rec.rating,
            priceLevel: rec.price_level,
            photoToken: rec.photo_token,
            distanceMeters: null,
            recommendationId: rec.id, // Store first recommendation ID for referral tracking
            referralUrl: null // Will be populated later
          });
        }

        const group = groups.get(key);
        group.count++;
        group.lastSubmittedAt = rec.created_at;
        
        // Add note if it exists
        if (rec.notes && rec.notes.trim()) {
          const displayName = rec.profiles?.display_name || 'Anonymous';
          group.notes.push({
            by: displayName,
            text: rec.notes.slice(0, 140)
          });
        }
      }

      // Fetch premium status for each restaurant
      const placeIds = Array.from(groups.values())
        .filter(g => g.placeId)
        .map(g => g.placeId);
      
      const { data: businessClaims } = await supabase
        .from('business_claims')
        .select(`
          place_id,
          user_id,
          business_profiles!inner(is_premium)
        `)
        .in('place_id', placeIds)
        .eq('status', 'verified');

      // Create a map of place_id to premium status
      const premiumMap = new Map();
      businessClaims?.forEach((claim: any) => {
        if (claim.place_id) {
          premiumMap.set(claim.place_id, claim.business_profiles?.is_premium === true);
        }
      });

      // Add premium status to groups
      groups.forEach((group) => {
        group.isPremium = group.placeId ? (premiumMap.get(group.placeId) || false) : false;
      });

      // Convert to array and sort with priority placement for premium businesses
      const sortedGroups = Array.from(groups.values()).sort((a, b) => {
        // Priority 1: Premium status (premium businesses first)
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
        // Priority 2: Recommendation count
        if (b.count !== a.count) return b.count - a.count;
        
        // Priority 3: Alphabetically
        return a.name.localeCompare(b.name);
      });

      // Reverse notes to show latest first
      sortedGroups.forEach(group => {
        group.notes = group.notes.reverse().slice(0, 3);
      });

      console.log('🔍 Debug: Groups before referral generation:', sortedGroups.map(g => ({
        name: g.name,
        mapsUrl: g.mapsUrl,
        recommendationId: g.recommendationId
      })));

      // Generate referral links for each group
      for (const group of sortedGroups) {
        console.log(`🔗 Processing ${group.name}: hasRecommendationId=${!!group.recommendationId}, hasMapsUrl=${!!group.mapsUrl}`);
        
        if (group.recommendationId && group.mapsUrl) {
          try {
            console.log(`🔗 Generating referral link for ${group.name}...`);
            const referralData = await generateReferralLink({
              recommendationId: group.recommendationId,
              requestId,
              restaurantName: group.name,
              placeId: group.placeId,
              mapsUrl: group.mapsUrl
            });
            
            if (referralData) {
              group.referralUrl = referralData.referralUrl;
              console.log('✅ Generated referral URL for', group.name, referralData.referralUrl);
            } else {
              console.warn('⚠️ No referral data returned for', group.name);
              group.referralUrl = group.mapsUrl;
            }
          } catch (error) {
            console.error('❌ Failed to generate referral for', group.name, error);
            // Fall back to original maps URL
            group.referralUrl = group.mapsUrl;
          }
        } else {
          console.warn(`⚠️ Missing data for ${group.name}: recommendationId=${group.recommendationId}, mapsUrl=${group.mapsUrl}`);
          // If we have a maps URL but no recommendation ID, use the maps URL directly
          if (group.mapsUrl) {
            group.referralUrl = group.mapsUrl;
          }
        }
      }

      console.log('🔍 Final groups with referral URLs:', sortedGroups.map(g => ({
        name: g.name,
        referralUrl: g.referralUrl,
        mapsUrl: g.mapsUrl
      })));

      setResults({
        requestId,
        status: requestData.status,
        expiresAt: requestData.expires_at,
        totalRecommendations: recommendations?.length || 0,
        groups: sortedGroups,
        hasMore: false
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!request?.expires_at) return;

    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      setTimeRemaining("closed");
      return;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else {
      setTimeRemaining(`${minutes}m`);
    }
  };

  useEffect(() => {
    if (requestId) {
      // Track request view and reset feedback flags if this is a new request
      feedbackSessionManager.trackRequestView(requestId);
      fetchResults();
      // Reset feedback flag when requestId changes (new request)
      feedbackShownRef.current = false;
    }
  }, [requestId]);

  useEffect(() => {
    if (request) {
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [request]);

  useEffect(() => {
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, [requestId]);

  // Cleanup feedback timer on unmount or navigation
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        console.log('🧹 Cleaning up feedback timer on unmount/navigation');
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, []);

  const toggleNotes = (groupKey: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedNotes(newExpanded);
  };

  const formatPrice = (priceLevel?: number) => {
    if (priceLevel === null || priceLevel === undefined) return "—";
    return "$".repeat(Math.max(1, priceLevel));
  };

  const formatDistance = (distanceMeters?: number) => {
    if (!distanceMeters) return "";
    
    const miles = distanceMeters * 0.000621371;
    if (miles < 1) {
      return `${Math.round(distanceMeters)} m`;
    }
    return `${miles.toFixed(1)} mi`;
  };

  const getPhotoUrl = (photoToken?: string) => {
    if (!photoToken) return null;
    return `https://edazolwepxbdeniluamf.supabase.co/functions/v1/places-photo?ref=${photoToken}&w=200`;
  };

  const handleGoingClick = async (group: RecommendationGroup) => {
    if (!user || !request) return;
    
    try {
      // Generate or get existing referral link first
      if (group.recommendationId && group.mapsUrl) {
        await generateReferralLink({
          recommendationId: group.recommendationId,
          requestId: request.id,
          restaurantName: group.name,
          placeId: group.placeId,
          mapsUrl: group.mapsUrl
        });
      }

      // Call edge function to securely log the visit intent
      const { data, error } = await supabase.functions.invoke('log-visit-intent', {
        body: {
          recommendationId: group.recommendationId,
          requestId: request.id,
          restaurantName: group.name,
          placeId: group.placeId
        }
      });

      if (error) {
        console.error('Error logging going intent:', error);
        toast.error('Failed to log your intent');
        return;
      }

      // Mark as "going" in local state
      setGoingIntents(prev => new Set([...prev, group.key]));
      
      // Show success message
      toast.success(`Great choice! We've logged your intent to visit ${group.name}`);
      
      // Clear any existing feedback timer
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      
      // Only trigger feedback if it hasn't been shown yet for this request
      if (!feedbackShownRef.current) {
        // Trigger feedback popup after 1-second delay
        console.log('🎯 Will show feedback popup in 1 second...');
        feedbackTimerRef.current = setTimeout(() => {
          console.log('🎯 Showing feedback popup now!');
          setShowFeedbackTrigger(true);
          feedbackShownRef.current = true; // Mark feedback as shown
          feedbackTimerRef.current = null;
        }, 1000);
      } else {
        console.log('🎯 Feedback already shown for this request, skipping');
      }

    } catch (error) {
      console.error('Error handling going click:', error);
      toast.error('Something went wrong');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (!request || !results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Request not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = timeRemaining === "closed" || request.status === 'closed';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                Top Recommendations for {request.food_type}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {isExpired ? (
                  <span className="text-red-600 font-medium">Request closed</span>
                ) : (
                  <span>Closes in {timeRemaining}</span>
                )}
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              {request.location_city}, {request.location_state}
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">
              This request has been closed. No new recommendations can be submitted.
            </p>
          </div>
        )}

        {/* Results */}
        {results.groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-muted/50 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-medium mb-2">No recommendations yet</h3>
              <p className="text-muted-foreground">
                We'll update this page when results arrive. Check back soon!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {results.groups.map((group) => {
              const photoUrl = getPhotoUrl(group.photoToken);
              const isNotesExpanded = expandedNotes.has(group.key);
              const hasMoreNotes = group.notes.length > 1;

              return (
                <Card key={group.key} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Photo */}
                      <div className="w-24 h-24 bg-muted shrink-0 flex items-center justify-center">
                        {photoUrl ? (
                          <img 
                            src={photoUrl} 
                            alt={`Photo of ${group.name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-muted-foreground">
                            <MapPin className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {/* Name and Badge */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-lg">{group.name}</h3>
                              {group.isPremium && (
                                <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shrink-0">
                                  ⭐ Featured Partner
                                </Badge>
                              )}
                              <Badge variant="secondary" className="shrink-0">
                                {group.count} recommended
                              </Badge>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              {group.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                                  <span>{group.rating.toFixed(1)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatPrice(group.priceLevel)}</span>
                              </div>
                              {group.distanceMeters && (
                                <span>{formatDistance(group.distanceMeters)}</span>
                              )}
                              <span>{request.location_city}</span>
                            </div>

                            {/* Notes */}
                            {group.notes.length > 0 && (
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  {(isNotesExpanded ? group.notes : group.notes.slice(0, 1)).map((note, idx) => (
                                    <div key={idx} className="text-sm">
                                      <span className="font-medium text-primary">{note.by}:</span>
                                      <span className="ml-2 text-muted-foreground">{note.text}</span>
                                    </div>
                                  ))}
                                </div>

                                {hasMoreNotes && (
                                  <Collapsible>
                                    <CollapsibleTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => toggleNotes(group.key)}
                                        className="text-primary hover:text-primary/80 p-0 h-auto"
                                      >
                                        {isNotesExpanded ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Hide notes
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            Show all notes
                                          </>
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                  </Collapsible>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="shrink-0 flex gap-2">
                            {/* Going Button */}
                            {user && request && user.id === request.requester_id && (
                              <Button 
                                variant={goingIntents.has(group.key) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleGoingClick(group)}
                                disabled={goingIntents.has(group.key)}
                                className="whitespace-nowrap"
                              >
                                {goingIntents.has(group.key) ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Going!
                                  </>
                                ) : (
                                  "I'm Going"
                                )}
                              </Button>
                            )}
                            
                            {/* Maps Button */}
                            {(group.referralUrl || group.mapsUrl) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                                className="whitespace-nowrap"
                              >
                                <a 
                                  href={group.referralUrl || group.mapsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  aria-label={`Open ${group.name} in Maps`}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Open in Maps
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Feedback Section - Only show to the requester */}
                        {user && request && user.id === request.requester_id && group.recommendationId && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <FeedbackButtons 
                              recommendationId={group.recommendationId}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Load More */}
            {results.hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline">
                  Show more recommendations
                </Button>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-6">
              Showing top {results.groups.length} of {results.totalRecommendations} recommendations
            </div>
          </div>
        )}
      </div>
      
      <AppFeedbackTrigger
        role="requester"
        sourceAction="selected_going_option"
        shouldTrigger={showFeedbackTrigger}
        onTriggered={() => {
          console.log('🎯 Feedback intro modal displayed');
          setShowFeedbackTrigger(false); // Reset immediately to prevent re-triggers
          feedbackSessionManager.markFeedbackSubmitted();
        }}
        onComplete={() => {
          console.log('🎯 Feedback completed, resetting state');
        }}
      />
      
      <ExitIntentFeedbackTrigger
        role="requester"
        sourceAction="exit_intent_requester"
      />
    </div>
  );
};

export default RequestResults;