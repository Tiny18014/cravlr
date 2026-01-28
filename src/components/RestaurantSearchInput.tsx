import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PremiumBadge } from './PremiumBadge';

interface RestaurantSuggestion {
  placeId: string;
  name: string;
  address: string;
  description: string;
  isPremium?: boolean;
}

interface RestaurantSearchInputProps {
  value: string;
  onChange: (name: string, address: string, placeId?: string) => void;
  placeholder?: string;
  required?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  location?: string | null;
}

export const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = React.memo(({
  value,
  onChange,
  placeholder = "Search for restaurants...",
  required = false,
  userLocation,
  location
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized search function
  const searchRestaurants = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[RestaurantSearch] ===== SEARCH START =====');
      console.log('[RestaurantSearch] Query:', query);
      console.log('[RestaurantSearch] User location (coords):', userLocation);
      console.log('[RestaurantSearch] Location string:', location);
      
      const requestBody = {
        input: query,
        ...(userLocation && { lat: userLocation.lat, lng: userLocation.lng }),
        ...(location && !userLocation && { location }),
        radiusKm: 40
      };

      console.log('[RestaurantSearch] Request body:', requestBody);

      const { data, error: apiError } = await supabase.functions.invoke('places-search/autocomplete', {
        body: requestBody
      });

      if (apiError) {
        console.error('[RestaurantSearch] ❌ Places search error:', apiError);
        setError('Unable to search restaurants. Please try again.');
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      console.log('[RestaurantSearch] ✅ Got suggestions:', data?.length, 'results');
      
      let combinedSuggestions = [...(data || [])];
      
      // Fetch premium status for all suggestions
      const placeIds = combinedSuggestions.map(s => s.placeId).filter(Boolean);
      if (placeIds.length > 0) {
        const { data: businessData } = await supabase
          .from('business_claims')
          .select(`place_id, business_profiles!inner(is_premium)`)
          .in('place_id', placeIds)
          .eq('status', 'verified');
        
        const premiumMap = new Map();
        businessData?.forEach((claim: any) => {
          if (claim.place_id) {
            premiumMap.set(claim.place_id, claim.business_profiles?.is_premium === true);
          }
        });
        
        combinedSuggestions = combinedSuggestions
          .map(s => ({ ...s, isPremium: premiumMap.get(s.placeId) || false }))
          .sort((a, b) => {
            if (a.isPremium && !b.isPremium) return -1;
            if (!a.isPremium && b.isPremium) return 1;
            return 0;
          });
      }
      
      setSuggestions(combinedSuggestions);
      setIsOpen(combinedSuggestions.length > 0);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[RestaurantSearch] ❌ Restaurant search error:', err);
      setError('Search failed. Please check your connection and try again.');
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, [userLocation, location]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 1) {
        searchRestaurants(searchTerm);
      } else {
        setSuggestions([]);
        setIsOpen(false);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchRestaurants]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const selectRestaurant = useCallback((suggestion: RestaurantSuggestion) => {
    setSearchTerm(suggestion.name);
    onChange(suggestion.name, suggestion.address, suggestion.placeId);
    setIsOpen(false);
    setSuggestions([]);
    setError(null);
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue, '', undefined);
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  }, [suggestions.length]);

  const handleRetry = useCallback(() => {
    if (searchTerm) {
      searchRestaurants(searchTerm);
    }
  }, [searchTerm, searchRestaurants]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Error state with retry button */}
      {error && !loading && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-background">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {isOpen && suggestions.length > 0 && !error && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border shadow-lg bg-background">
          <div className="p-1">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.placeId}
                variant="ghost"
                className="w-full justify-start h-auto p-3 text-left font-normal hover:bg-muted"
                onClick={() => selectRestaurant(suggestion)}
              >
                <div className="flex items-start gap-3 w-full">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {suggestion.name}
                      </span>
                      {suggestion.isPremium && (
                        <PremiumBadge size="sm" variant="featured" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.address}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {isOpen && suggestions.length === 0 && !loading && !error && searchTerm.length >= 2 && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-background">
          <div className="p-4 text-center text-sm text-muted-foreground">
            No restaurants found for "{searchTerm}"
          </div>
        </Card>
      )}
    </div>
  );
});

RestaurantSearchInput.displayName = 'RestaurantSearchInput';
