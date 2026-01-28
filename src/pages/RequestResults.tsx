import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ArrowLeft, MapPin, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralLinks } from "@/hooks/useReferralLinks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { feedbackSessionManager } from "@/utils/feedbackSessionManager";

interface Note {
  by: string;
  text: string;
}

interface RecommendationGroup {
  key: string;
  name: string;
  placeId?: string;
  address?: string;
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
  recommendationId?: string;
  referralUrl?: string;
  isPremium?: boolean;
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
  expire_at: string;
  status: string;
}

// Skeleton loading component
const ResultsSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// Memoized recommendation card component
const RecommendationCard = React.memo(({ 
  group,
  isExpanded,
  onToggleNotes,
  onGoingClick,
  onNotGoingClick,
  isGoing,
  formatDistance,
  formatPrice,
  getPhotoUrl
}: {
  group: RecommendationGroup;
  isExpanded: boolean;
  onToggleNotes: () => void;
  onGoingClick: () => void;
  onNotGoingClick: () => void;
  isGoing: boolean;
  formatDistance: (d?: number) => string;
  formatPrice: (p?: number) => string;
  getPhotoUrl: (t?: string) => string | null;
}) => {
  const photoUrl = getPhotoUrl(group.photoToken);
  
  return (
    <Card className={`overflow-hidden ${group.isPremium ? 'ring-2 ring-primary/50' : ''}`}>
      {group.isPremium && (
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-1.5 text-xs font-medium text-primary flex items-center gap-1">
          <Star className="h-3 w-3 fill-primary" />
          Featured Restaurant
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo */}
          <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-muted overflow-hidden">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={group.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                🍽️
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                {group.count} vote{group.count !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {group.address && (
              <p className="text-xs text-muted-foreground truncate mb-2">
                {group.address}
              </p>
            )}
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {group.rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {group.rating.toFixed(1)}
                </span>
              )}
              {group.priceLevel !== undefined && (
                <span>{formatPrice(group.priceLevel)}</span>
              )}
              {group.distanceMeters && (
                <span>{formatDistance(group.distanceMeters)}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Notes Section */}
        {group.notes.length > 0 && (
          <Collapsible open={isExpanded}>
            <CollapsibleTrigger 
              onClick={onToggleNotes}
              className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {group.notes.length} note{group.notes.length !== 1 ? 's' : ''} from locals
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {group.notes.map((note, idx) => (
                <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-foreground">{note.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">— {note.by}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {group.referralUrl && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => window.open(group.referralUrl, '_blank', 'noopener,noreferrer')}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Open in Maps
            </Button>
          )}
          
          {!isGoing && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onGoingClick}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Going
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onNotGoingClick}
                className="text-muted-foreground"
              >
                Not Going
              </Button>
            </>
          )}
          
          {isGoing && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              ✓ You're going here
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
RecommendationCard.displayName = 'RecommendationCard';

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
  const { generateReferralLink } = useReferralLinks();
  const hasFetched = useRef(false);

  const fetchResults = useCallback(async () => {
    if (!requestId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch request details first
      const { data: requestData, error: requestError } = await supabase
        .from('food_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (requestError || !requestData) {
        console.error('Error fetching request:', requestError);
        setLoading(false);
        return;
      }

      setRequest(requestData);

      // PERFORMANCE FIX: Fetch recommendations with profile names in a single query
      const { data: recommendations, error: recError } = await supabase
        .from('recommendations')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (recError) {
        console.error('Error fetching recommendations:', recError);
        return;
      }

      // Batch fetch all recommender profiles
      const recommenderIds = [...new Set((recommendations || []).map(r => r.recommender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', recommenderIds);
      
      const profileMap = new Map<string, string>();
      (profiles || []).forEach(p => {
        profileMap.set(p.id, p.display_name || 'Anonymous');
      });

      // Group recommendations by restaurant
      const groups = new Map<string, RecommendationGroup>();
      
      for (const rec of recommendations || []) {
        const key = rec.place_id || rec.restaurant_name.toLowerCase().trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
        
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            name: rec.restaurant_name,
            placeId: rec.place_id,
            address: rec.restaurant_address,
            mapsUrl: rec.maps_url,
            count: 0,
            firstSubmittedAt: rec.created_at,
            lastSubmittedAt: rec.created_at,
            notes: [],
            rating: null,
            priceLevel: null,
            photoToken: null,
            distanceMeters: null,
            recommendationId: rec.id,
            referralUrl: null
          });
        }

        const group = groups.get(key)!;
        group.count++;
        group.lastSubmittedAt = rec.created_at;
        
        if (rec.notes && rec.notes.trim()) {
          const displayName = profileMap.get(rec.recommender_id) || 'Anonymous';
          group.notes.push({
            by: displayName,
            text: rec.notes.slice(0, 140)
          });
        }
      }

      // Fetch premium status in batch
      const placeIds = Array.from(groups.values())
        .filter(g => g.placeId)
        .map(g => g.placeId);
      
      if (placeIds.length > 0) {
        const { data: businessClaims } = await supabase
          .from('business_claims')
          .select(`
            place_id,
            user_id,
            business_profiles!inner(is_premium)
          `)
          .in('place_id', placeIds)
          .eq('status', 'verified');

        const premiumMap = new Map();
        businessClaims?.forEach((claim: any) => {
          if (claim.place_id) {
            premiumMap.set(claim.place_id, claim.business_profiles?.is_premium === true);
          }
        });

        groups.forEach((group) => {
          group.isPremium = group.placeId ? (premiumMap.get(group.placeId) || false) : false;
        });
      }

      // Sort groups
      const sortedGroups = Array.from(groups.values()).sort((a, b) => {
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

      // Reverse notes to show latest first
      sortedGroups.forEach(group => {
        group.notes = group.notes.reverse().slice(0, 3);
      });

      // PERFORMANCE FIX: Generate referral links in parallel instead of sequentially
      await Promise.all(
        sortedGroups
          .filter(g => g.recommendationId && g.mapsUrl)
          .map(async (group) => {
            try {
              const referralData = await generateReferralLink({
                recommendationId: group.recommendationId!,
                requestId,
                restaurantName: group.name,
                placeId: group.placeId,
                mapsUrl: group.mapsUrl!
              });
              
              if (referralData) {
                group.referralUrl = referralData.referralUrl;
              } else {
                group.referralUrl = group.mapsUrl;
              }
            } catch {
              group.referralUrl = group.mapsUrl;
            }
          })
      );

      // For groups without referral data, use mapsUrl directly
      sortedGroups.forEach(group => {
        if (!group.referralUrl && group.mapsUrl) {
          group.referralUrl = group.mapsUrl;
        }
      });

      setResults({
        requestId,
        status: requestData.status,
        expiresAt: requestData.expire_at,
        totalRecommendations: recommendations?.length || 0,
        groups: sortedGroups,
        hasMore: false
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId, user, generateReferralLink]);

  // Initial fetch
  useEffect(() => {
    if (requestId && !hasFetched.current) {
      feedbackSessionManager.trackRequestView(requestId);
      fetchResults();
      hasFetched.current = true;
    }
  }, [requestId, fetchResults]);

  // PERFORMANCE FIX: Use realtime subscription instead of polling
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`request-results-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recommendations',
          filter: `request_id=eq.${requestId}`
        },
        () => {
          // Refetch when new recommendations come in
          fetchResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, fetchResults]);

  // Update time remaining
  useEffect(() => {
    if (!request?.expire_at) return;

    const updateTime = () => {
      const now = new Date();
      const expiresAt = new Date(request.expire_at);
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

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [request?.expire_at]);

  const toggleNotes = useCallback((groupKey: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  const formatPrice = useCallback((priceLevel?: number) => {
    if (priceLevel === null || priceLevel === undefined) return "—";
    return "$".repeat(Math.max(1, priceLevel));
  }, []);

  const formatDistance = useCallback((distanceMeters?: number) => {
    if (!distanceMeters) return "";
    const miles = distanceMeters * 0.000621371;
    if (miles < 1) {
      return `${Math.round(distanceMeters)} m`;
    }
    return `${miles.toFixed(1)} mi`;
  }, []);

  const getPhotoUrl = useCallback((photoToken?: string) => {
    if (!photoToken) return null;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ioqogdxfmapcijmqjcpb.supabase.co';
    return `${supabaseUrl}/functions/v1/places-photo?ref=${photoToken}&w=200`;
  }, []);

  const handleGoingClick = useCallback(async (group: RecommendationGroup) => {
    if (!user || !request || !group.recommendationId) {
      toast.error('Unable to log intent');
      return;
    }
    
    try {
      if (group.mapsUrl) {
        await generateReferralLink({
          recommendationId: group.recommendationId,
          requestId: request.id,
          restaurantName: group.name,
          placeId: group.placeId,
          mapsUrl: group.mapsUrl
        });
      }

      const { error } = await supabase.functions.invoke('log-visit-intent', {
        body: {
          recommendationId: group.recommendationId,
          requestId: request.id,
          restaurantName: group.name,
          placeId: group.placeId
        }
      });

      if (error) {
        toast.error('Failed to log your intent');
        return;
      }

      setGoingIntents(prev => new Set([...prev, group.key]));
      toast.success("Enjoy your meal! Redirecting…");
      
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      toast.error('Something went wrong');
    }
  }, [user, request, generateReferralLink, navigate]);

  const handleNotGoingClick = useCallback(async (group: RecommendationGroup) => {
    if (!user || !request || !group.recommendationId) {
      toast.error('Unable to log');
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('handle-recommendation-decline', {
        body: {
          recommendationId: group.recommendationId,
          requestId: request.id,
          restaurantName: group.name
        }
      });

      if (error) {
        toast.error('Failed to update');
        return;
      }
      
      toast.success("Thanks for letting us know!");
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      toast.error('Something went wrong');
    }
  }, [user, request, navigate]);

  const isExpired = useMemo(() => 
    timeRemaining === "closed" || request?.status === 'closed',
    [timeRemaining, request?.status]
  );

  if (loading) {
    return <ResultsSkeleton />;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Results for "{request.food_type}"</h1>
            <p className="text-sm text-muted-foreground">
              {request.location_city}, {request.location_state}
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {results.totalRecommendations} recommendation{results.totalRecommendations !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isExpired ? 'Request closed' : `Closes in ${timeRemaining}`}
                </p>
              </div>
              <Badge variant={isExpired ? "secondary" : "default"}>
                {isExpired ? 'Closed' : 'Active'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {results.groups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🍽️</div>
              <p className="text-muted-foreground mb-2">No recommendations yet</p>
              <p className="text-sm text-muted-foreground">
                Check back soon - locals are reviewing your request!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.groups.map((group) => (
              <RecommendationCard
                key={group.key}
                group={group}
                isExpanded={expandedNotes.has(group.key)}
                onToggleNotes={() => toggleNotes(group.key)}
                onGoingClick={() => handleGoingClick(group)}
                onNotGoingClick={() => handleNotGoingClick(group)}
                isGoing={goingIntents.has(group.key)}
                formatDistance={formatDistance}
                formatPrice={formatPrice}
                getPhotoUrl={getPhotoUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestResults;
