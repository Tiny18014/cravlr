import { useState, useEffect } from 'react';

// Countries where GPS is enabled
const GPS_ENABLED_COUNTRIES = ['IN', 'NP']; // India and Nepal

export const useGpsCountryDetection = () => {
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try to get rough location for country detection
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 3600000 // 1 hour cache for country detection
          });
        });

        const { latitude, longitude } = position.coords;
        
        // Use reverse geocoding to detect country
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          const countryCode = data.address?.country_code?.toUpperCase();
          console.log('🌍 Detected country:', countryCode);
          setDetectedCountry(countryCode || null);
        }
      } catch (error) {
        console.log('📍 Country detection failed, GPS will be disabled:', error);
        setDetectedCountry(null);
      } finally {
        setIsDetecting(false);
      }
    };

    detectCountry();
  }, []);

  const isGpsEnabled = detectedCountry && GPS_ENABLED_COUNTRIES.includes(detectedCountry);

  return { detectedCountry, isDetecting, isGpsEnabled };
};
