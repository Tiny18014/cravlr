import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2, Navigation, Building2, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface NormalizedLocation {
  type: 'area' | 'place';
  displayLabel: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  countryName?: string;
  countryCode?: string;
  stateOrRegion?: string;
  cityOrLocality?: string;
  postalCode?: string;
  providerPlaceId?: string;
  name?: string;
  categories?: string[];
  rating?: number;
  priceLevel?: number;
}

interface LocationAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onLocationSelect: (location: NormalizedLocation) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showGpsButton?: boolean;
  includeRestaurants?: boolean;
  onGpsLocation?: (location: NormalizedLocation) => void;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onValueChange,
  onLocationSelect,
  placeholder = "Search city, neighborhood, or restaurant...",
  disabled = false,
  className,
  showGpsButton = true,
  includeRestaurants = true,
  onGpsLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<NormalizedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Try to get user's location on mount for better suggestions
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Silently fail - we'll just not have location bias
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 3600000 }
      );
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('location-resolve', {
          body: {
            query: value,
            lat: userCoords?.lat,
            lng: userCoords?.lng,
            includeRestaurants,
          }
        });

        if (error) {
          console.error('Error fetching locations:', error);
          setSuggestions([]);
          setIsOpen(false);
          return;
        }

        const results = data?.data || [];
        setSuggestions(results.slice(0, 8));
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error('Error searching locations:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, userCoords, includeRestaurants]);

  const handleInputChange = (newValue: string) => {
    onValueChange(newValue);
  };

  const handleLocationSelect = (location: NormalizedLocation) => {
    onValueChange(location.displayLabel);
    onLocationSelect(location);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  const clearInput = () => {
    onValueChange('');
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleUseGps = async () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support GPS location.",
        variant: "destructive",
      });
      return;
    }

    setIsGeolocating(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get location details
      const { data, error } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat: latitude, lng: longitude }
      });

      if (error) throw error;

      const location = data?.data;
      if (location) {
        const normalizedLocation: NormalizedLocation = {
          type: 'area',
          displayLabel: location.displayLabel,
          formattedAddress: location.formattedAddress,
          lat: location.lat,
          lng: location.lng,
          countryName: location.countryName,
          countryCode: location.countryCode,
          stateOrRegion: location.stateOrRegion,
          cityOrLocality: location.cityOrLocality,
          postalCode: location.postalCode,
        };

        onValueChange(location.displayLabel);
        onLocationSelect(normalizedLocation);
        onGpsLocation?.(normalizedLocation);

        toast({
          title: "Location captured",
          description: `Set to ${location.displayLabel}`,
        });
      }
    } catch (error: any) {
      console.error('GPS error:', error);
      
      let message = "Please enter your location manually.";
      if (error.code === 1) {
        message = "Location access was denied. Please enable location permissions or enter manually.";
      } else if (error.code === 2) {
        message = "Unable to determine your location. Please try again or enter manually.";
      } else if (error.code === 3) {
        message = "Location request timed out. Please try again or enter manually.";
      }

      toast({
        title: "Location unavailable",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeolocating(false);
    }
  };

  const getLocationIcon = (location: NormalizedLocation) => {
    if (location.type === 'place') {
      return <Utensils className="h-4 w-4 text-primary flex-shrink-0" />;
    }
    return <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  };

  return (
    <div className="space-y-2">
      {showGpsButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseGps}
          disabled={isGeolocating || disabled}
          className="w-full sm:w-auto rounded-xl border-2 border-primary text-primary hover:bg-primary/10"
        >
          {isGeolocating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4 mr-2" />
              Use my location
            </>
          )}
        </Button>
      )}

      <div className="relative w-full">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pl-10 pr-10 h-12 text-base",
              className
            )}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {value && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={clearInput}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
        </div>
        
        {isOpen && suggestions.length > 0 && !isLoading && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.providerPlaceId || suggestion.displayLabel}-${index}`}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground flex items-start gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleLocationSelect(suggestion);
                }}
              >
                {getLocationIcon(suggestion)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {suggestion.displayLabel}
                    {suggestion.type === 'place' && suggestion.rating && (
                      <span className="text-xs text-muted-foreground">
                        ★ {suggestion.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {suggestion.type === 'place' ? suggestion.formattedAddress : (
                      [suggestion.stateOrRegion, suggestion.countryName].filter(Boolean).join(', ')
                    )}
                  </div>
                  {suggestion.type === 'place' && (
                    <div className="text-xs text-primary mt-0.5">Restaurant</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
