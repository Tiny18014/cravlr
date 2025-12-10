import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { MapPin, Camera, Target, Check } from 'lucide-react';
import { useGpsCountryDetection } from '@/hooks/useGpsCountryDetection';

// Goal 3: Distance unit options
type DistanceUnit = 'miles' | 'km';

const UserOnboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Location state
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [cityInput, setCityInput] = useState('');
  
  // Goal 4: Profile picture state (replaces cuisine expertise)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  
  // Goal 3: Search range state with unit support
  const [searchRange, setSearchRange] = useState('local');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('miles');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { isGpsEnabled, isDetecting: isDetectingCountry } = useGpsCountryDetection();
  const navigate = useNavigate();

  const requestLocationPermission = async () => {
    setLocationLoading(true);
    setGpsAttempted(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Available",
        description: "Your browser doesn't support location services. Please enter your city manually.",
        variant: "destructive",
      });
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setLocationLat(lat);
        setLocationLng(lng);
        
        // Reverse geocode to get city and state
        try {
          const { data, error } = await supabase.functions.invoke('geocode', {
            body: { lat, lng }
          });
          
          if (error) throw error;
          
          if (data?.city && data?.state) {
            setLocationCity(data.city);
            setLocationState(data.state);
            setCityInput(`${data.city}, ${data.state}`);
            
            toast({
              title: "Location Found!",
              description: `Using your location: ${data.city}, ${data.state}`,
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Location Found",
            description: "We found your GPS coordinates. Please enter your city manually.",
          });
        }
        
        setLocationLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "Location Access Denied",
          description: "Please enter your city manually below.",
          variant: "destructive",
        });
        setLocationLoading(false);
      }
    );
  };

  const handleCitySelect = (city: string, state: string) => {
    setLocationCity(city);
    setLocationState(state);
  };

  // Goal 4: Handle profile image change
  const handleProfileImageChange = (newUrl: string | null) => {
    setProfileImageUrl(newUrl);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!locationCity || !locationState) {
        toast({
          title: "Location Required",
          description: "Please provide your location to continue.",
          variant: "destructive",
        });
        return;
      }
    }
    // Step 2 (profile picture) is optional - can skip
    
    setStep(step + 1);
  };

  // Goal 3: Convert distance to kilometers for storage (normalized)
  const getDistanceInKm = (rangeValue: string): number => {
    const rangeMap: Record<string, { miles: number; km: number }> = {
      'local': { miles: 5, km: 8 },
      'nearby': { miles: 25, km: 40 },
      '10mi': { miles: 10, km: 16 },
      '25mi': { miles: 25, km: 40 },
      '50mi': { miles: 50, km: 80 },
    };
    
    const range = rangeMap[rangeValue] || rangeMap['nearby'];
    return range.km;
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Goal 3: Store notification_radius_km (always in km for consistency)
      const notificationRadiusKm = getDistanceInKm(searchRange);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          location_city: locationCity,
          location_state: locationState,
          profile_lat: locationLat,
          profile_lng: locationLng,
          search_range: searchRange,
          notification_radius_km: notificationRadiusKm,
          // Note: profile_image_url is already updated by ProfilePictureUpload component
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Preferences Saved!",
        description: "Your preferences have been saved. Let's find you some great food!",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((num) => (
        <div key={num} className="flex items-center">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              num === step
                ? 'bg-[#FF6A3D] text-white scale-110'
                : num < step
                ? 'bg-[#9DBF70] text-white'
                : 'bg-[#F5F1E8] text-[#6B5B52]'
            }`}
          >
            {num < step ? <Check className="h-4 w-4" /> : num}
          </div>
          {num < 3 && (
            <div
              className={`h-1 w-12 mx-1 transition-all ${
                num < step ? 'bg-[#9DBF70]' : 'bg-[#F5F1E8]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Goal 3: Get display label for range based on unit
  const getRangeLabel = (range: string) => {
    const labels: Record<string, { miles: string; km: string }> = {
      'local': { miles: 'Local (Same City)', km: 'Local (Same City)' },
      'nearby': { miles: 'Nearby (Within 25 miles)', km: 'Nearby (Within 40 km)' },
    };
    return labels[range]?.[distanceUnit] || range;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            {step === 1 && <MapPin className="h-12 w-12 text-[#FF6A3D]" />}
            {step === 2 && <Camera className="h-12 w-12 text-[#FF6A3D]" />}
            {step === 3 && <Target className="h-12 w-12 text-[#FF6A3D]" />}
          </div>
          
          {renderStepIndicator()}
          
          <CardTitle className="text-2xl font-poppins font-semibold text-[#3E2F25]">
            {step === 1 && 'Where are you located?'}
            {step === 2 && 'Add a Profile Picture'}
            {step === 3 && 'Search Range Preference'}
          </CardTitle>
          
          <p className="text-sm text-[#6B5B52] font-nunito">
            {step === 1 && 'Help us show you the best local food recommendations'}
            {step === 2 && 'Let others see who they\'re getting recommendations from (optional)'}
            {step === 3 && 'How far would you like to search for food recommendations?'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              {!gpsAttempted && isGpsEnabled && (
                <Button
                  onClick={requestLocationPermission}
                  disabled={locationLoading || isDetectingCountry}
                  className="w-full bg-gradient-to-r from-[#FF6A3D] to-[#FF3B30] text-white font-poppins font-semibold"
                  size="lg"
                >
                  {locationLoading ? 'Getting Location...' : 'Use My Current Location'}
                </Button>
              )}
              
              {(gpsAttempted || locationCity) && (
                <div className="relative">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex-1 border-t border-[#9DBF70]/30" />
                    <span className="px-3 text-sm text-[#6B5B52] font-nunito">or enter manually</span>
                    <div className="flex-1 border-t border-[#9DBF70]/30" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="city" className="font-poppins text-[#3E2F25]">City</Label>
                <CityAutocomplete
                  value={cityInput}
                  onValueChange={setCityInput}
                  onCitySelect={handleCitySelect}
                  placeholder="Enter your city..."
                />
              </div>
            </div>
          )}
          
          {/* Step 2: Profile Picture (Goal 4 - replaces cuisine expertise) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <ProfilePictureUpload
                  currentImageUrl={profileImageUrl}
                  displayName={user?.email?.split('@')[0] || 'User'}
                  onImageChange={handleProfileImageChange}
                  size="lg"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Click the camera icon to upload a photo
                </p>
              </div>
              
              <div className="p-4 bg-[#F5F1E8] rounded-lg">
                <p className="text-sm text-[#6B5B52] text-center">
                  📸 A profile picture helps build trust and makes your recommendations more personal!
                </p>
              </div>
            </div>
          )}
          
          {/* Step 3: Search Range with Unit Toggle (Goal 3) */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Unit Toggle */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Label className="text-sm text-[#6B5B52]">Distance unit:</Label>
                <div className="flex bg-[#F5F1E8] rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setDistanceUnit('miles')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      distanceUnit === 'miles'
                        ? 'bg-white text-[#FF6A3D] shadow-sm'
                        : 'text-[#6B5B52] hover:text-[#3E2F25]'
                    }`}
                  >
                    Miles
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistanceUnit('km')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      distanceUnit === 'km'
                        ? 'bg-white text-[#FF6A3D] shadow-sm'
                        : 'text-[#6B5B52] hover:text-[#3E2F25]'
                    }`}
                  >
                    Kilometers
                  </button>
                </div>
              </div>

              <RadioGroup value={searchRange} onValueChange={setSearchRange} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 rounded-lg border-2 border-[#9DBF70]/30 hover:border-[#9DBF70] hover:bg-[#F5F1E8]/50 transition-all cursor-pointer">
                  <RadioGroupItem value="local" id="local" className="border-[#9DBF70]" />
                  <Label htmlFor="local" className="flex-1 cursor-pointer">
                    <div className="font-poppins font-semibold text-[#3E2F25]">Local (Same City)</div>
                    <div className="text-sm text-[#6B5B52] font-nunito">Only show restaurants in your city</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 rounded-lg border-2 border-[#9DBF70]/30 hover:border-[#9DBF70] hover:bg-[#F5F1E8]/50 transition-all cursor-pointer">
                  <RadioGroupItem value="nearby" id="nearby" className="border-[#9DBF70]" />
                  <Label htmlFor="nearby" className="flex-1 cursor-pointer">
                    <div className="font-poppins font-semibold text-[#3E2F25]">
                      {distanceUnit === 'miles' ? 'Nearby (Within 25 Miles)' : 'Nearby (Within 40 km)'}
                    </div>
                    <div className="text-sm text-[#6B5B52] font-nunito">
                      Include restaurants within {distanceUnit === 'miles' ? '25 miles' : '40 kilometers'}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button
                onClick={() => setStep(step - 1)}
                variant="outline"
                className="flex-1 border-[#9DBF70] text-[#3E2F25] hover:bg-[#9DBF70]/10 font-poppins font-semibold"
                size="lg"
              >
                Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button
                onClick={handleNextStep}
                className="flex-1 bg-gradient-to-r from-[#FF6A3D] to-[#FF3B30] text-white font-poppins font-semibold"
                size="lg"
              >
                {step === 2 ? (profileImageUrl ? 'Next' : 'Skip for Now') : 'Next'}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#FF6A3D] to-[#FF3B30] text-white font-poppins font-semibold"
                size="lg"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserOnboarding;