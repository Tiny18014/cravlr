import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2, Navigation, Building2, Utensils, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Full normalized location with administrative hierarchy
export interface AdminLevel {
  level: string;
  name: string;
  code?: string;
}

export interface NormalizedLocation {
  id?: string;
  type: 'area' | 'place' | 'address';
  displayLabel: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  // Full administrative hierarchy
  continent?: string;
  countryName?: string;
  countryCode?: string;
  region?: string;
  county?: string;
  city?: string;
  suburb?: string;
  neighborhood?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  adminHierarchy?: AdminLevel[];
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  source?: 'google_geocoding' | 'google_places' | 'osm_nominatim' | 'manual_map_pick';
  // For places (restaurants)
  providerPlaceId?: string;
  name?: string;
  categories?: string[];
  rating?: number;
  priceLevel?: number;
  userRatingsTotal?: number;
}

interface LocationAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onLocationSelect: (location: NormalizedLocation) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showGpsButton?: boolean;
  showMapPicker?: boolean;
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
  showMapPicker = true,
  includeRestaurants = true,
  onGpsLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<NormalizedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
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
        setSuggestions(results.slice(0, 10));
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error('Error searching locations:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 350);

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

    // Save to user's current location
    saveUserLocation(location, false);
  };

  const saveUserLocation = async (location: NormalizedLocation, isFromGps: boolean) => {
    try {
      await supabase.functions.invoke('user-location', {
        body: { location, isFromGps },
      });
    } catch (error) {
      console.error('Failed to save user location:', error);
    }
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
          timeout: 15000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get location details
      const { data, error } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat: latitude, lng: longitude, source: 'gps' }
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
          region: location.region,
          county: location.county,
          city: location.city,
          suburb: location.suburb,
          neighborhood: location.neighborhood,
          street: location.street,
          houseNumber: location.houseNumber,
          postalCode: location.postalCode,
          adminHierarchy: location.adminHierarchy,
          source: location.source,
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

  const handleMapLocationSelect = (location: NormalizedLocation) => {
    onValueChange(location.displayLabel);
    onLocationSelect(location);
    setShowMapModal(false);

    toast({
      title: "Location set",
      description: `Set to ${location.displayLabel}`,
    });
  };

  const getLocationIcon = (location: NormalizedLocation) => {
    if (location.type === 'place') {
      return <Utensils className="h-4 w-4 text-primary flex-shrink-0" />;
    }
    if (location.type === 'address') {
      return <MapPin className="h-4 w-4 text-primary flex-shrink-0" />;
    }
    return <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  };

  const getLocationTypeLabel = (location: NormalizedLocation) => {
    if (location.type === 'place') return 'Restaurant';
    if (location.type === 'address') return 'Address';
    if (location.neighborhood) return 'Neighborhood';
    if (location.suburb) return 'Area';
    if (location.city) return 'City';
    if (location.region) return 'Region';
    return 'Location';
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {showGpsButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseGps}
            disabled={isGeolocating || disabled}
            className="rounded-xl border-2 border-primary text-primary hover:bg-primary/10"
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

        {showMapPicker && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMapModal(true)}
            disabled={disabled}
            className="rounded-xl border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted/10"
          >
            <Map className="h-4 w-4 mr-2" />
            Pick on map
          </Button>
        )}
      </div>

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
              "pl-10 pr-10 h-12 text-base rounded-full border-2 border-primary",
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
                    {suggestion.type === 'place' 
                      ? suggestion.formattedAddress 
                      : [suggestion.region, suggestion.countryName].filter(Boolean).join(', ')
                    }
                  </div>
                  <div className="text-xs text-primary mt-0.5">
                    {getLocationTypeLabel(suggestion)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Picker Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Pick your location on the map</DialogTitle>
          </DialogHeader>
          <MapLocationPicker 
            onLocationSelect={handleMapLocationSelect}
            initialCoords={userCoords}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Map Location Picker Component
interface MapLocationPickerProps {
  onLocationSelect: (location: NormalizedLocation) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  onLocationSelect,
  initialCoords,
) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<NormalizedLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  // Default to world view or user's location
  const defaultCenter = initialCoords || { lat: 20, lng: 0 };
  const defaultZoom = initialCoords ? 14 : 2;

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        setMapLoaded(true);
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkLoaded = setInterval(() => {
          if (window.google?.maps) {
            setMapLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 100);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not configured');
        toast({
          title: "Map unavailable",
          description: "Map picker is not configured. Please use text search instead.",
          variant: "destructive",
        });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => {
        toast({
          title: "Map failed to load",
          description: "Please use text search instead.",
          variant: "destructive",
        });
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [toast]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance) return;

    const google = (window as any).google;
    if (!google?.maps) return;

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    const newMarker = new google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    // Handle marker drag
    newMarker.addListener('dragend', () => {
      const pos = newMarker.getPosition();
      if (pos) {
        throttledReverseGeocode(pos.lat(), pos.lng());
      }
    });

    // Handle map click
    map.addListener('click', (e: any) => {
      if (e.latLng) {
        newMarker.setPosition(e.latLng);
        throttledReverseGeocode(e.latLng.lat(), e.latLng.lng());
      }
    });

    setMapInstance(map);
    setMarker(newMarker);

    // Initial reverse geocode if we have coords
    if (initialCoords) {
      throttledReverseGeocode(initialCoords.lat, initialCoords.lng);
    }
  }, [mapLoaded, defaultCenter, defaultZoom]);

  const throttledReverseGeocode = useCallback((lat: number, lng: number) => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 500);
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat, lng, source: 'map_pick' }
      });

      if (error) throw error;

      const location = data?.data;
      if (location) {
        setCurrentLocation({
          type: 'area',
          displayLabel: location.displayLabel,
          formattedAddress: location.formattedAddress,
          lat: location.lat,
          lng: location.lng,
          countryName: location.countryName,
          countryCode: location.countryCode,
          region: location.region,
          county: location.county,
          city: location.city,
          suburb: location.suburb,
          neighborhood: location.neighborhood,
          street: location.street,
          houseNumber: location.houseNumber,
          postalCode: location.postalCode,
          adminHierarchy: location.adminHierarchy,
          source: 'manual_map_pick',
        });
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      setCurrentLocation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (currentLocation) {
      onLocationSelect(currentLocation);
    }
  };

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        ref={mapRef} 
        className="w-full h-80 rounded-lg border border-border"
        style={{ minHeight: '320px' }}
      />
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Click or drag the pin to select your location</span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Getting location details...</span>
          </div>
        )}

        {currentLocation && !isLoading && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium">{currentLocation.displayLabel}</div>
            <div className="text-sm text-muted-foreground">{currentLocation.formattedAddress}</div>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={!currentLocation || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting location...
            </>
          ) : (
            'Confirm Location'
          )}
        </Button>
      </div>
    </div>
  );
};