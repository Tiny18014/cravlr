import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CuisineMultiSelect } from '@/components/CuisineMultiSelect';
import { MapPin, Utensils, Target, Check, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { useGpsCountryDetection } from '@/hooks/useGpsCountryDetection';
import { LocationAutocomplete, NormalizedLocation } from '@/components/LocationAutocomplete';
import { normalizeLocationString, hasValidCoordinates } from '@/utils/locationNormalization';

// Goal 3: Distance unit options
type DistanceUnit = 'miles' | 'km';

const UserOnboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Location state - single location only
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationCountry, setLocationCountry] = useState('');
  const [locationInput, setLocationInput] = useState('');
  
  // Cuisine expertise state (replaces profile picture)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  
  // Goal 3: Search range state with unit support
  const [searchRange, setSearchRange] = useState('local');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('miles');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { isGpsEnabled, isDetecting: isDetectingCountry } = useGpsCountryDetection();
  const navigate = useNavigate();

  // Handle location selection from autocomplete (single location only)
  const handleLocationSelect = (location: NormalizedLocation) => {
    console.log('[Signup:Location] Location selected:', location);
    
    // Normalize city and state names
    const normalizedCity = normalizeLocationString(location.city || location.displayLabel);
    const normalizedState = normalizeLocationString(location.region || '');
    
    setLocationCity(normalizedCity);
    setLocationState(normalizedState);
    setLocationLat(location.lat);
    setLocationLng(location.lng);
    setLocationCountry(location.countryCode || '');
    
    console.log('[Signup:Location] Saving to form state:', {
      city: normalizedCity,
      state: normalizedState,
      lat: location.lat,
      lng: location.lng,
      country: location.countryCode || '',
      hasValidCoords: hasValidCoordinates(location.lat, location.lng),
    });
  };

  // Handle GPS location callback
  const handleGpsLocation = (location: NormalizedLocation) => {
    console.log('[Signup:Location] GPS location obtained:', location);
    setLocationInput(location.displayLabel);
    handleLocationSelect(location);
    console.log('[Signup:Location] GPS location set successfully');
  };

  // No longer needed - replaced by handleLocationSelect


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
      
      // Validate that we have coordinates for accurate geo-filtering
      if (!hasValidCoordinates(locationLat, locationLng)) {
        toast({
          title: "Location Incomplete",
          description: "Please select a location from the suggestions or use GPS to ensure accurate matching.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (step === 2) {
      if (selectedCuisines.length === 0) {
        toast({
          title: "Select at least one cuisine",
          description: "Please select at least one cuisine you specialize in.",
          variant: "destructive",
        });
        return;
      }
    }
    
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
          profile_country: locationCountry,
          search_range: searchRange,
          notification_radius_km: notificationRadiusKm,
          cuisine_expertise: selectedCuisines,
        })
        .eq('id', user.id);
      
      console.log('[Signup:Location] Profile saved with location:', { locationCity, locationState, locationLat, locationLng, locationCountry });
      
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
            {step === 2 && <Utensils className="h-12 w-12 text-[#FF6A3D]" />}
            {step === 3 && <Target className="h-12 w-12 text-[#FF6A3D]" />}
          </div>
          
          {renderStepIndicator()}
          
          <CardTitle className="text-2xl font-poppins font-semibold text-[#3E2F25]">
            {step === 1 && 'Where are you located?'}
            {step === 2 && 'Your Food Expertise'}
            {step === 3 && 'Search Range Preference'}
          </CardTitle>
          
          <p className="text-sm text-[#6B5B52] font-nunito">
            {step === 1 && 'Help us show you the best local food recommendations'}
            {step === 2 && 'What cuisines do you specialize in?'}
            {step === 3 && 'How far would you like to search for food recommendations?'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Location - Single location only */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="font-poppins text-[#3E2F25]">Your Location</Label>
                <p className="text-xs text-[#6B5B52] mb-2">We use this to match you with nearby food requests</p>
                <LocationAutocomplete
                  value={locationInput}
                  onValueChange={setLocationInput}
                  onLocationSelect={handleLocationSelect}
                  onGpsLocation={handleGpsLocation}
                  placeholder="Search your city or use GPS..."
                  showGpsButton={true}
                  showMapPicker={true}
                  includeRestaurants={false}
                />
              </div>
              
              {/* Show selected location confirmation */}
              {locationCity && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  hasValidCoordinates(locationLat, locationLng)
                    ? 'bg-[#9DBF70]/10 border border-[#9DBF70]/30'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  {hasValidCoordinates(locationLat, locationLng) ? (
                    <MapPin className="h-5 w-5 text-[#9DBF70]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#3E2F25]">
                      {locationCity}{locationState ? `, ${locationState}` : ''}
                    </span>
                    {!hasValidCoordinates(locationLat, locationLng) && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Please select from suggestions or use GPS for accurate matching
                      </p>
                    )}
                  </div>
                  {hasValidCoordinates(locationLat, locationLng) && (
                    <Check className="h-4 w-4 text-[#9DBF70]" />
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Food Expertise (Cuisine Selection) */}
          {step === 2 && (
            <div className="space-y-4">
              <CuisineMultiSelect
                value={selectedCuisines}
                onChange={setSelectedCuisines}
                placeholder="Search cuisines..."
              />
              
              <p className={`text-sm text-center ${selectedCuisines.length === 0 ? 'text-[#FF6A3D]' : 'text-[#6B5B52]'}`}>
                {selectedCuisines.length === 0 
                  ? 'Select at least one cuisine' 
                  : `${selectedCuisines.length} cuisine${selectedCuisines.length > 1 ? 's' : ''} selected`}
              </p>
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
                Next
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