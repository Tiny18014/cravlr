import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NormalizedLocation, AdminLevel } from '@/components/LocationAutocomplete';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

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
    console.log('[Location] Button clicked');
    console.log('[Location] Platform:', Capacitor.getPlatform());
    console.log('[Location] Is native:', Capacitor.isNativePlatform());

    setIsGeolocating(true);
    setError(null);

    try {
      let latitude: number;
      let longitude: number;

      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Geolocation for native platforms
        console.log('[Location] Using Capacitor Geolocation API');
        
        // Check current permissions
        console.log('[Location] Checking permissions...');
        let permissionStatus = await Geolocation.checkPermissions();
        console.log('[Location] Current permission:', permissionStatus.location);

        // Request permission if not granted
        if (permissionStatus.location !== 'granted') {
          console.log('[Location] Requesting permission...');
          toast({
            title: "Location Permission",
            description: "Please allow location access to use this feature.",
          });
          
          permissionStatus = await Geolocation.requestPermissions();
          console.log('[Location] Permission after request:', permissionStatus.location);

          if (permissionStatus.location !== 'granted') {
            const msg = "Location permission was denied. Please enable location access in your device settings.";
            console.error('[Location] ERROR: Permission denied');
            setError(msg);
            toast({
              title: "Permission Denied",
              description: msg,
              variant: "destructive",
            });
            setIsGeolocating(false);
            return null;
          }
        }

        console.log('[Location] Permission granted, getting position...');
        
        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });

        console.log('[Location] Position obtained:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

      } else {
        // Fall back to browser geolocation API for web
        console.log('[Location] Using browser navigator.geolocation API');
        
        if (!('geolocation' in navigator)) {
          const msg = "Geolocation is not supported by your browser.";
          console.error('[Location] ERROR:', msg);
          setError(msg);
          toast({
            title: "GPS Not Supported",
            description: msg,
            variant: "destructive",
          });
          setIsGeolocating(false);
          return null;
        }

        console.log('[Location] Getting position from browser...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000, // 5 minute cache
          });
        });

        console.log('[Location] Browser position obtained:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      console.log('[Location] Reverse geocoding coordinates:', { latitude, longitude });

      // Call backend to reverse geocode
      const { data, error: apiError } = await supabase.functions.invoke('location-from-coordinates', {
        body: { lat: latitude, lng: longitude, source: 'gps' }
      });

      if (apiError) {
        console.error('[Location] ERROR: Reverse geocode failed:', apiError);
        throw new Error(apiError.message || 'Failed to reverse geocode location');
      }

      const locationData = data?.data;
      if (!locationData) {
        console.error('[Location] ERROR: No location data returned');
        throw new Error('No location data returned');
      }

      console.log('[Location] Reverse geocode result:', locationData);

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

      console.log('[Location] SUCCESS! ✅ Location set to:', normalizedLocation.displayLabel);

      toast({
        title: "Location captured",
        description: `Set to ${locationData.displayLabel}`,
      });

      return normalizedLocation;
    } catch (err: any) {
      console.error('[Location] ERROR:', err);
      
      let message = "Unable to get your location. Please enter it manually.";
      
      // Handle Capacitor-specific errors
      if (err.message?.includes('location disabled') || err.message?.includes('Location services')) {
        message = "Location services are disabled. Please enable GPS in your device settings.";
      } else if (err.message?.includes('denied') || err.message?.includes('permission')) {
        message = "Location access was denied. Please enable location permissions in your device settings.";
      } else if (err.message?.includes('timeout')) {
        message = "Location request timed out. Please try again or enter manually.";
      }
      // Handle browser geolocation errors
      else if (err.code === 1) {
        message = "Location access was denied. Please enable location permissions in your browser settings, or enter your location manually.";
      } else if (err.code === 2) {
        message = "Unable to determine your location. Please check your device's GPS or enter manually.";
      } else if (err.code === 3) {
        message = "Location request timed out. Please try again or enter manually.";
      }

      console.error('[Location] User-friendly error message:', message);
      setError(message);
      toast({
        title: "Location unavailable",
        description: message,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsGeolocating(false);
      console.log('[Location] Geolocation request completed');
    }
  }, [toast]);

  const clearLocation = useCallback(() => {
    console.log('[Location] Clearing location');
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
