import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Map, Loader2, Check, X, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NormalizedLocation } from '@/components/LocationAutocomplete';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface LocationSettingProps {
  initialCity: string;
  initialState: string;
  initialLat: number | null;
  initialLng: number | null;
  initialCountry: string;
  onLocationChange: (location: {
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
    country: string;
    displayLabel: string;
  }) => void;
  disabled?: boolean;
}

export const LocationSetting: React.FC<LocationSettingProps> = ({
  initialCity,
  initialState,
  initialLat,
  initialLng,
  initialCountry,
  onLocationChange,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Autocomplete state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<NormalizedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Current displayed location (what user sees)
  const [displayLocation, setDisplayLocation] = useState<string>('');
  
  // Last saved location (for comparison)
  const [savedLocation, setSavedLocation] = useState<string>('');
  
  // Track if location has been changed since last save
  const [hasChanged, setHasChanged] = useState(false);

  // Initialize display from initial props
  useEffect(() => {
    const label = formatLocationLabel(initialCity, initialState);
    setDisplayLocation(label);
    setSavedLocation(label);
    setHasChanged(false);
  }, [initialCity, initialState]);

  const formatLocationLabel = (city: string, state: string): string => {
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    return '';
  };

  // Debounced search for autocomplete suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!hasUserTyped || searchInput.length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        console.log('[Preferences:Location] Searching for:', searchInput);
        
        const { data, error } = await supabase.functions.invoke('location-resolve', {
          body: {
            query: searchInput,
            includeRestaurants: false,
          }
        });

        if (error) {
          console.error('[Preferences:Location] Search error:', error);
          setSuggestions([]);
          setIsDropdownOpen(false);
          return;
        }

        const results = data?.data || [];
        console.log('[Preferences:Location] Found', results.length, 'results');
        setSuggestions(results.slice(0, 8));
        setIsDropdownOpen(results.length > 0);
      } catch (error) {
        console.error('[Preferences:Location] Search error:', error);
        setSuggestions([]);
        setIsDropdownOpen(false);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput, hasUserTyped]);

  const handleInputChange = (value: string) => {
    setHasUserTyped(true);
    setSearchInput(value);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setIsDropdownOpen(false), 200);
  };

  const clearInput = () => {
    setSearchInput('');
    setIsDropdownOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleLocationSelected = (location: NormalizedLocation) => {
    const newLabel = location.displayLabel;
    console.log('[Preferences:Location] Location selected:', newLabel);
    
    setDisplayLocation(newLabel);
    setHasChanged(newLabel !== savedLocation);
    setSearchInput('');
    setHasUserTyped(false);
    setIsDropdownOpen(false);
    setSuggestions([]);
    
    onLocationChange({
      city: location.city || '',
      state: location.region || '',
      lat: location.lat,
      lng: location.lng,
      country: location.countryName || '',
      displayLabel: newLabel,
    });
    
    toast({
      title: "Location updated",
      description: `Set to ${newLabel}`,
    });
  };

  const handleUseGps = async () => {
    console.log('[Preferences:Location] GPS button clicked');
    console.log('[Preferences:Location] Platform:', Capacitor.getPlatform());
    console.log('[Preferences:Location] Is native:', Capacitor.isNativePlatform());

    setIsGeolocating(true);

    try {
      let latitude: number;
      let longitude: number;

      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Geolocation for native platforms
        console.log('[Preferences:Location] Using Capacitor Geolocation API');
        
        // Check current permissions
        console.log('[Preferences:Location] Checking permissions...');
        let permissionStatus = await Geolocation.checkPermissions();
        console.log('[Preferences:Location] Current permission:', permissionStatus.location);

        // Request permission if not granted
        if (permissionStatus.location !== 'granted') {
          console.log('[Preferences:Location] Requesting permission...');
          toast({
            title: "Location Permission",
            description: "Please allow location access to use this feature.",
          });
          
          permissionStatus = await Geolocation.requestPermissions();
          console.log('[Preferences:Location] Permission after request:', permissionStatus.location);

          if (permissionStatus.location !== 'granted') {
            console.error('[Preferences:Location] Permission denied');
            throw { code: 1, message: 'Location permission denied' };
          }
        }

        console.log('[Preferences:Location] Permission granted, getting position...');
        
        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });

        console.log('[Preferences:Location] Position obtained:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

      } else {
        // Fall back to browser geolocation API for web
        console.log('[Preferences:Location] Using browser navigator.geolocation API');
        
        if (!('geolocation' in navigator)) {
          console.error('[Preferences:Location] Geolocation not supported');
          toast({
            title: "Geolocation not supported",
            description: "Your browser doesn't support GPS location.",
            variant: "destructive",
          });
          setIsGeolocating(false);
          return;
        }

        console.log('[Preferences:Location] Getting position from browser...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000,
          });
        });

        console.log('[Preferences:Location] Browser position obtained:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      console.log('[Preferences:Location] Reverse geocoding coordinates:', { latitude, longitude });

      const { data, error } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat: latitude, lng: longitude, source: 'gps' }
      });

      if (error) throw error;

      const locationData = data?.data;
      if (locationData) {
        console.log('[Preferences:Location] Reverse geocode result:', locationData);
        
        const normalizedLocation: NormalizedLocation = {
          type: 'area',
          displayLabel: locationData.displayLabel,
          formattedAddress: locationData.formattedAddress,
          lat: locationData.lat,
          lng: locationData.lng,
          countryName: locationData.countryName,
          countryCode: locationData.countryCode,
          region: locationData.region,
          county: locationData.county,
          city: locationData.city,
          suburb: locationData.suburb,
          neighborhood: locationData.neighborhood,
          street: locationData.street,
          houseNumber: locationData.houseNumber,
          postalCode: locationData.postalCode,
          adminHierarchy: locationData.adminHierarchy,
          source: locationData.source,
        };

        console.log('[Preferences:Location] Updating location preference:', normalizedLocation.displayLabel);
        handleLocationSelected(normalizedLocation);

        toast({
          title: "Location captured",
          description: `Set to ${locationData.displayLabel}`,
        });
      }
    } catch (error: any) {
      console.error('[Preferences:Location] GPS error:', error);
      
      let message = "Please use Pick on map instead.";
      
      // Handle Capacitor-specific errors
      if (error.message?.includes('location disabled') || error.message?.includes('Location services')) {
        message = "Location services are disabled. Please enable GPS in your device settings.";
      } else if (error.message?.includes('denied') || error.message?.includes('permission')) {
        message = "Location access was denied. Please enable location permissions in your device settings.";
      } else if (error.message?.includes('timeout')) {
        message = "Location request timed out. Please try again or use Pick on map.";
      }
      // Handle browser geolocation errors
      else if (error.code === 1) {
        message = "Location access was denied. Please enable location permissions or use Pick on map.";
      } else if (error.code === 2) {
        message = "Unable to determine your location. Please try again or use Pick on map.";
      } else if (error.code === 3) {
        message = "Location request timed out. Please try again or use Pick on map.";
      }

      console.error('[Preferences:Location] User-friendly error:', message);
      toast({
        title: "Location unavailable",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeolocating(false);
      console.log('[Preferences:Location] GPS request completed');
    }
  };

  const handleMapLocationSelect = (location: NormalizedLocation) => {
    handleLocationSelected(location);
    setShowMapModal(false);

    toast({
      title: "Location set",
      description: `Set to ${location.displayLabel}`,
    });
  };

  // Mark location as saved (called after parent saves)
  const markAsSaved = () => {
    setSavedLocation(displayLocation);
    setHasChanged(false);
  };

  // Expose method for parent to call
  React.useImperativeHandle(
    React.useRef({ markAsSaved, hasChanged: () => hasChanged, savedLocation, displayLocation }),
    () => ({ markAsSaved, hasChanged: () => hasChanged, savedLocation, displayLocation })
  );

  return (
    <div className="py-4">
      <p className="text-sm font-medium text-foreground mb-3">Default Location</p>
      
      {/* Single Location Input with Autocomplete */}
      <div className="relative mb-3">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={displayLocation || "Search city, neighborhood, or address..."}
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            className={cn(
              "pl-10 pr-10 h-12 text-base rounded-xl border-2",
              displayLocation && !searchInput ? "border-primary bg-primary/5" : "border-border"
            )}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchInput && !isSearching && (
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
            {!searchInput && displayLocation && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
        </div>
        
        {/* Autocomplete Dropdown */}
        {isDropdownOpen && suggestions.length > 0 && !isSearching && (
          <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.displayLabel}-${index}`}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-0"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleLocationSelected(suggestion);
                }}
              >
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {suggestion.displayLabel}
                  </p>
                  {suggestion.formattedAddress && suggestion.formattedAddress !== suggestion.displayLabel && (
                    <p className="text-sm text-muted-foreground truncate">
                      {suggestion.formattedAddress}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-2">
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
      </div>

      <p className="text-xs text-muted-foreground">
        {displayLocation ? `Current: ${displayLocation}` : "Used for matching food requests and sending nearby notifications"}
      </p>

      {/* Map Picker Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Pick your location on the map</DialogTitle>
          </DialogHeader>
          <MapLocationPickerInternal 
            onLocationSelect={handleMapLocationSelect}
            initialCoords={initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Internal Map Location Picker (copied from LocationAutocomplete to avoid circular deps)
interface MapLocationPickerInternalProps {
  onLocationSelect: (location: NormalizedLocation) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

const MapLocationPickerInternal: React.FC<MapLocationPickerInternalProps> = ({
  onLocationSelect,
  initialCoords,
}) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<NormalizedLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();
  const throttleRef = React.useRef<NodeJS.Timeout | null>(null);

  const defaultCenter = initialCoords || { lat: 20, lng: 0 };
  const defaultZoom = initialCoords ? 14 : 2;

  useEffect(() => {
    const loadGoogleMaps = async () => {
      if ((window as any).google?.maps) {
        setMapLoaded(true);
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkLoaded = setInterval(() => {
          if ((window as any).google?.maps) {
            setMapLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 100);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-maps-config');
        
        if (error || !data?.apiKey) {
          console.error('Failed to get maps config:', error);
          toast({
            title: "Map unavailable",
            description: "Map picker is not configured.",
            variant: "destructive",
          });
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load maps:', error);
      }
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance) return;

    const google = (window as any).google;
    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const newMarker = new google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
    });

    setMapInstance(map);
    setMarker(newMarker);

    if (initialCoords) {
      reverseGeocode(initialCoords.lat, initialCoords.lng);
    }

    map.addListener('click', (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      newMarker.setPosition({ lat, lng });
      throttledReverseGeocode(lat, lng);
    });

    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        throttledReverseGeocode(position.lat(), position.lng());
      }
    });
  }, [mapLoaded]);

  const throttledReverseGeocode = (lat: number, lng: number) => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
    throttleRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 500);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat, lng, source: 'manual_map_pick' }
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (currentLocation) {
      onLocationSelect(currentLocation);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg border border-border"
      />
      
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Getting location details...
        </div>
      )}

      {currentLocation && !isLoading && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium">{currentLocation.displayLabel}</p>
          <p className="text-sm text-muted-foreground">{currentLocation.formattedAddress}</p>
        </div>
      )}

      <Button 
        onClick={handleConfirm} 
        disabled={!currentLocation || isLoading}
        className="w-full"
      >
        Confirm Location
      </Button>
    </div>
  );
};

export default LocationSetting;
