import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { MapPin, Utensils, Target, Check } from 'lucide-react';

const CUISINE_OPTIONS = [
  'African',
  'American',
  'Chinese',
  'Indian',
  'Italian',
  'Japanese',
  'Mediterranean',
  'Mexican',
  'Nepali',
  'Thai',
  'Other'
];

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
  
  // Cuisine expertise state
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  
  // Search range state
  const [searchRange, setSearchRange] = useState('local');
  
  const { user } = useAuth();
  const { toast } = useToast();
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

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
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
    } else if (step === 2) {
      if (selectedCuisines.length === 0) {
        toast({
          title: "Select At Least One",
          description: "Please select at least one cuisine expertise.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          location_city: locationCity,
          location_state: locationState,
          cuisine_expertise: selectedCuisines,
          search_range: searchRange,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Preferences Saved!",
        description: "Your preferences have been saved — personalized food recommendations are coming soon!",
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
            {step === 2 && 'Your Cuisine Expertise'}
            {step === 3 && 'Search Range Preference'}
          </CardTitle>
          
          <p className="text-sm text-[#6B5B52] font-nunito">
            {step === 1 && 'Help us show you the best local food recommendations'}
            {step === 2 && 'Select cuisines you know well or have cultural expertise in'}
            {step === 3 && 'How far would you like to search for food recommendations?'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              {!gpsAttempted && (
                <Button
                  onClick={requestLocationPermission}
                  disabled={locationLoading}
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
          
          {/* Step 2: Cuisine Expertise */}
          {step === 2 && (
            <div className="space-y-3">
              {CUISINE_OPTIONS.map((cuisine) => (
                <div key={cuisine} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#F5F1E8]/50 transition-colors">
                  <Checkbox
                    id={cuisine}
                    checked={selectedCuisines.includes(cuisine)}
                    onCheckedChange={() => toggleCuisine(cuisine)}
                    className="border-[#9DBF70]"
                  />
                  <Label
                    htmlFor={cuisine}
                    className="flex-1 cursor-pointer font-nunito text-[#3E2F25]"
                  >
                    {cuisine}
                  </Label>
                </div>
              ))}
            </div>
          )}
          
          {/* Step 3: Search Range */}
          {step === 3 && (
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
                  <div className="font-poppins font-semibold text-[#3E2F25]">Nearby (Within 25 Miles)</div>
                  <div className="text-sm text-[#6B5B52] font-nunito">Include restaurants within 25 miles</div>
                </Label>
              </div>
            </RadioGroup>
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