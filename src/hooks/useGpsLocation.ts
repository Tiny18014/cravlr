import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NormalizedLocation, AdminLevel } from '@/components/LocationAutocomplete';

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
        body: { lat: latitude, lng: longitude, source: 'gps' }
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

// Hook to fetch user's saved location
export const useUserLocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<NormalizedLocation | null>(null);

  const fetchUserLocation = useCallback(async (): Promise<NormalizedLocation | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-location', {
        method: 'GET',
      });

      if (error) throw error;

      if (data?.data) {
        // Transform from snake_case to camelCase
        const loc = data.data;
        const normalized: NormalizedLocation = {
          type: 'area',
          displayLabel: loc.place_label || loc.city || 'Unknown',
          formattedAddress: loc.formatted_address,
          lat: loc.lat,
          lng: loc.lng,
          countryName: loc.country_name,
          countryCode: loc.country_code,
          region: loc.region,
          county: loc.county,
          city: loc.city,
          suburb: loc.suburb,
          neighborhood: loc.neighborhood,
          street: loc.street,
          houseNumber: loc.house_number,
          postalCode: loc.postal_code,
          adminHierarchy: loc.admin_hierarchy,
          source: loc.source,
        };
        setUserLocation(normalized);
        return normalized;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch user location:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserLocation = useCallback(async (location: NormalizedLocation, isFromGps: boolean = false) => {
    try {
      await supabase.functions.invoke('user-location', {
        body: { location, isFromGps },
      });
      setUserLocation(location);
    } catch (err) {
      console.error('Failed to save user location:', err);
    }
  }, []);

  return {
    isLoading,
    userLocation,
    fetchUserLocation,
    saveUserLocation,
  };
};