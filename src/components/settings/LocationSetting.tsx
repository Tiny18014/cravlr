import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Map, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NormalizedLocation } from '@/components/LocationAutocomplete';

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

  const handleLocationSelected = (location: NormalizedLocation) => {
    const newLabel = location.displayLabel;
    setDisplayLocation(newLabel);
    setHasChanged(newLabel !== savedLocation);
    
    onLocationChange({
      city: location.city || '',
      state: location.region || '',
      lat: location.lat,
      lng: location.lng,
      country: location.countryName || '',
      displayLabel: newLabel,
    });
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

      const { data, error } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat: latitude, lng: longitude, source: 'gps' }
      });

      if (error) throw error;

      const locationData = data?.data;
      if (locationData) {
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

        handleLocationSelected(normalizedLocation);

        toast({
          title: "Location captured",
          description: `Set to ${locationData.displayLabel}`,
        });
      }
    } catch (error: any) {
      console.error('GPS error:', error);
      
      let message = "Please use Pick on map instead.";
      if (error.code === 1) {
        message = "Location access was denied. Please enable location permissions or use Pick on map.";
      } else if (error.code === 2) {
        message = "Unable to determine your location. Please try again or use Pick on map.";
      } else if (error.code === 3) {
        message = "Location request timed out. Please try again or use Pick on map.";
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
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
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

      {/* Display selected location as fixed value */}
      {displayLocation ? (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border-2",
          hasChanged ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        )}>
          <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="text-base font-medium text-foreground flex-1">
            {displayLocation}
          </span>
          {!hasChanged && (
            <Check className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/10">
          <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-base text-muted-foreground">
            No location set
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Used for matching food requests and sending nearby notifications
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
