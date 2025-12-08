import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NormalizedLocation } from '@/components/LocationAutocomplete';

interface UseGpsLocationReturn {
  isGeolocating: boolean;
  gpsLocation: NormalizedLocation | null;
  error: string | null;
  requestLocation: () => Promise<NormalizedLocation | null>;
  clearLocation: () => void;
}

export const useGpsLocation = (): UseGpsLocationReturn => {
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<NormalizedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const requestLocation = useCallback(async (): Promise<NormalizedLocation | null> => {
    if (!('geolocation' in navigator)) {
      const msg = "Geolocation is not supported by your browser.";
      setError(msg);
      toast({
        title: "GPS Not Supported",
        description: msg,
        variant: "destructive",
      });
      return null;
    }

    setIsGeolocating(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000, // 5 minute cache
        });
      });

      const { latitude, longitude } = position.coords;

      // Call backend to reverse geocode
      const { data, error: apiError } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat: latitude, lng: longitude }
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to reverse geocode location');
      }

      const locationData = data?.data;
      if (!locationData) {
        throw new Error('No location data returned');
      }

      const normalizedLocation: NormalizedLocation = {
        type: 'area',
        displayLabel: locationData.displayLabel,
        formattedAddress: locationData.formattedAddress,
        lat: locationData.lat,
        lng: locationData.lng,
        countryName: locationData.countryName,
        countryCode: locationData.countryCode,
        stateOrRegion: locationData.stateOrRegion,
        cityOrLocality: locationData.cityOrLocality,
        postalCode: locationData.postalCode,
      };

      setGpsLocation(normalizedLocation);

      toast({
        title: "Location captured",
        description: `Set to ${locationData.displayLabel}`,
      });

      return normalizedLocation;
    } catch (err: any) {
      console.error('GPS error:', err);
      
      let message = "Unable to get your location. Please enter it manually.";
      
      if (err.code === 1) {
        message = "Location access was denied. Please enable location permissions in your browser settings, or enter your location manually.";
      } else if (err.code === 2) {
        message = "Unable to determine your location. Please check your device's GPS or enter manually.";
      } else if (err.code === 3) {
        message = "Location request timed out. Please try again or enter manually.";
      }

      setError(message);
      toast({
        title: "Location unavailable",
        description: message,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsGeolocating(false);
    }
  }, [toast]);

  const clearLocation = useCallback(() => {
    setGpsLocation(null);
    setError(null);
  }, []);

  return {
    isGeolocating,
    gpsLocation,
    error,
    requestLocation,
    clearLocation,
  };
};
