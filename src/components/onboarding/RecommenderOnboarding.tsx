import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, ChefHat, Target } from 'lucide-react';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { useUserRoles } from '@/hooks/useUserRoles';

const CUISINE_OPTIONS = [
  'African', 'Italian', 'Indian', 'Nepali', 'Mexican',
  'Chinese', 'Japanese', 'Thai', 'Mediterranean', 'American', 'Other'
];

interface RecommenderOnboardingProps {
  onComplete?: () => void;
  isUpgrade?: boolean;
}

export const RecommenderOnboarding: React.FC<RecommenderOnboardingProps> = ({ 
  onComplete,
  isUpgrade = false 
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [searchRange, setSearchRange] = useState<'local' | 'nearby_25'>('local');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addRole } = useUserRoles();
  const searchParams = new URLSearchParams(window.location.search);
  const upgradeMode = isUpgrade || searchParams.get('upgrade') === 'true';

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

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
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

    if (step === 2 && selectedCuisines.length === 0) {
      toast({
        title: "Select at least one cuisine",
        description: "This helps match you with relevant requests.",
        variant: "destructive",
      });
      return;
    }

    setStep(step + 1);
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const updates: any = {
        location_city: locationCity,
        cuisine_expertise: selectedCuisines,
        search_range: searchRange,
      };

      if (locationLat !== null) updates.location_lat = locationLat;
      if (locationLng !== null) updates.location_lng = locationLng;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Add recommender role if upgrading
      if (upgradeMode) {
        const success = await addRole('recommender');
        if (!success) {
          throw new Error('Failed to add recommender role');
        }
      }

      toast({
        title: "Setup complete!",
        description: "You're ready to start recommending.",
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate('/browse-requests');
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
            {step === 2 && <ChefHat className="h-6 w-6 text-primary-foreground" />}
            {step === 3 && <Target className="h-6 w-6 text-primary-foreground" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 1 && 'Set Your Location'}
            {step === 2 && 'Your Cuisine Expertise'}
            {step === 3 && 'Search Range Preference'}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {step === 1 && 'Where are you located?'}
            {step === 2 && 'What cuisines do you know best?'}
            {step === 3 && 'How far should we look for requests?'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map((cuisine) => (
                  <Button
                    key={cuisine}
                    type="button"
                    variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCuisine(cuisine)}
                  >
                    {cuisine}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select cuisines you're knowledgeable about
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <Button
                  type="button"
                  variant={searchRange === 'local' ? "default" : "outline"}
                  className="justify-start h-auto py-4"
                  onClick={() => setSearchRange('local')}
                >
                  <div className="text-left">
                    <div className="font-semibold">Local (same city)</div>
                    <div className="text-xs text-muted-foreground">
                      Only show requests from your city
                    </div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={searchRange === 'nearby_25' ? "default" : "outline"}
                  className="justify-start h-auto py-4"
                  onClick={() => setSearchRange('nearby_25')}
                >
                  <div className="text-left">
                    <div className="font-semibold">Nearby (within 25 miles)</div>
                    <div className="text-xs text-muted-foreground">
                      Show requests within 25 miles of you
                    </div>
                  </div>
                </Button>
              </div>
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
