import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Search, Utensils } from 'lucide-react';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { useUserRoles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';

const CUISINE_OPTIONS = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai',
  'Mediterranean', 'Middle Eastern', 'Korean', 'Vietnamese', 'French', 'Spanish',
  'African', 'Latin/Caribbean', 'Brazilian', 'BBQ', 'Seafood', 'Pizza & Pasta',
  'Bakery/Desserts', 'Vegan/Vegetarian'
];

interface RequesterOnboardingProps {
  onComplete?: () => void;
  isUpgrade?: boolean;
}

export const RequesterOnboarding: React.FC<RequesterOnboardingProps> = ({ 
  onComplete,
  isUpgrade = false 
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [requestRange, setRequestRange] = useState<'nearby' | '5mi' | '10mi' | '15mi'>('nearby');
  const [hasExistingLocation, setHasExistingLocation] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addRole } = useUserRoles();

  useEffect(() => {
    checkExistingLocation();
  }, []);

  const checkExistingLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('location_city, location_state')
        .eq('id', user.id)
        .single();

      if (data?.location_city) {
        setHasExistingLocation(true);
        setLocationCity(data.location_city);
      }
    } catch (error) {
      console.error('Error checking location:', error);
    }
  };

  const requestLocationPermission = async () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter your city manually.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLat(latitude);
        setLocationLng(longitude);

        try {
          const response = await supabase.functions.invoke('geocode', {
            body: { lat: latitude, lng: longitude }
          });

          if (response.data?.city) {
            setLocationCity(response.data.city);
            toast({
              title: "Location captured",
              description: `Set to ${response.data.city}`,
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        toast({
          title: "Location access denied",
          description: "Please enter your city manually.",
          variant: "destructive",
        });
      }
    );
  };

  const handleCitySelect = (city: string, state: string) => {
    setLocationCity(`${city}, ${state}`);
    // Optionally geocode the city to get lat/lng
  };

  const handleNextStep = () => {
    if (step === 1 && !locationCity) {
      toast({
        title: "Location required",
        description: "Please set your location to continue.",
        variant: "destructive",
      });
      return;
    }

    setStep(step + 1);
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleComplete = async () => {
    if (selectedCuisines.length === 0) {
      toast({
        title: "Cuisine Required",
        description: "Please select at least one cuisine you specialize in.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          location_city: locationCity,
          cuisine_expertise: selectedCuisines,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Add requester role if upgrading
      if (isUpgrade) {
        await addRole('requester');
      }

      toast({
        title: "Setup complete!",
        description: "You're ready to request food recommendations.",
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate('/request-food');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-2 w-12 rounded-full transition-colors ${
            s === step ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          {renderStepIndicator()}
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto">
            {step === 1 && <MapPin className="h-6 w-6 text-primary-foreground" />}
            {step === 2 && <Search className="h-6 w-6 text-primary-foreground" />}
            {step === 3 && <Utensils className="h-6 w-6 text-primary-foreground" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 1 && 'Set Your Location'}
            {step === 2 && 'Default Request Range'}
            {step === 3 && 'Your Food Expertise'}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {step === 1 && 'Where are you located?'}
            {step === 2 && 'How far should we search for recommendations?'}
            {step === 3 && 'What cuisines do you specialize in?'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              {hasExistingLocation ? (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Current location:</p>
                    <p className="text-sm text-muted-foreground">{locationCity}</p>
                  </div>
                  <Button
                    onClick={requestLocationPermission}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? 'Getting location...' : 'Update with Current GPS'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={requestLocationPermission}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Getting location...' : 'Use GPS Location'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Type your city</Label>
                    <CityAutocomplete
                      value={locationCity}
                      onValueChange={setLocationCity}
                      onCitySelect={handleCitySelect}
                      placeholder="Search for your city..."
                    />
                  </div>

                  {locationCity && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Selected: {locationCity}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {['nearby', '5mi', '10mi', '15mi'].map((range) => (
                <Button
                  key={range}
                  type="button"
                  variant={requestRange === range ? "default" : "outline"}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => setRequestRange(range as any)}
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {range === 'nearby' ? 'Nearby' : `Within ${range.replace('mi', ' miles')}`}
                    </div>
                  </div>
                </Button>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                You can change this for each request
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCuisine(cuisine);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      {cuisine}
                    </button>
                  );
                })}
              </div>
              {selectedCuisines.length === 0 && (
                <p className="text-xs text-destructive">
                  Select at least one cuisine
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNextStep}
                className="flex-1"
                disabled={loading}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex-1"
                disabled={loading}
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
