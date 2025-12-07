import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Zap, Calendar, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { feedbackSessionManager } from '@/utils/feedbackSessionManager';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useGpsCountryDetection } from '@/hooks/useGpsCountryDetection';

const FLAVOR_MOODS = [
  'Spicy', 'Sweet', 'Savory/Umami', 'Sour/Tangy', 'Salty', 'Fresh/Light', 'Rich/Creamy', 'Anything'
] as const;

const CUISINE_OPTIONS = [
  'Chinese',
  'Italian',
  'Japanese',
  'Indian',
  'American',
  'Mexican',
  'French',
  'Thai',
  'Spanish',
  'Korean',
  'Vietnamese',
  'Mediterranean',
  'Middle Eastern',
  'Turkish',
  'Brazilian',
  'Nepalese'
] as const;

const requestSchema = z.object({
  flavorMoods: z.array(z.string()).min(1, 'Select at least one flavor mood'),
  cuisineStyles: z.array(z.string()).min(1, 'Select at least one cuisine style'),
  locationCity: z.string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City name is too long'),
  locationState: z.string()
    .trim()
    .length(2, 'State must be a 2-letter code')
    .regex(/^[A-Z]{2}$/, 'Invalid state code'),
  locationAddress: z.string()
    .trim()
    .max(200, 'Address is too long')
    .optional(),
  additionalNotes: z.string()
    .trim()
    .max(500, 'Additional notes must be less than 500 characters')
    .optional(),
  responseWindow: z.number()
    .int()
    .min(1, 'Response window must be at least 1 minute')
    .max(120, 'Response window cannot exceed 120 minutes'),
  lat: z.number()
    .min(-90)
    .max(90)
    .nullable(),
  lng: z.number()
    .min(-180)
    .max(180)
    .nullable()
});


const RequestFood = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [otherCuisine, setOtherCuisine] = useState('');
  const { isGpsEnabled, isDetecting: isDetectingCountry } = useGpsCountryDetection();
  
  const [formData, setFormData] = useState({
    flavorMoods: [] as string[],
    cuisineStyles: [] as string[],
    locationCity: '',
    locationState: '',
    locationAddress: '',
    additionalNotes: '',
    responseWindow: 2,
    lat: null as number | null,
    lng: null as number | null
  });

  const toggleFlavorMood = (mood: string) => {
    setFormData(prev => ({
      ...prev,
      flavorMoods: prev.flavorMoods.includes(mood)
        ? prev.flavorMoods.filter(m => m !== mood)
        : [...prev.flavorMoods, mood]
    }));
  };

  const toggleCuisine = (cuisine: string) => {
    setFormData(prev => ({
      ...prev,
      cuisineStyles: prev.cuisineStyles.includes(cuisine)
        ? prev.cuisineStyles.filter(c => c !== cuisine)
        : [...prev.cuisineStyles, cuisine]
    }));
  };

  const selectAnything = () => {
    setFormData(prev => ({
      ...prev,
      cuisineStyles: ['Anything']
    }));
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    setIsGeolocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      
      setFormData(prev => ({
        ...prev,
        lat: latitude,
        lng: longitude
      }));

      toast({
        title: "Location captured",
        description: "Using your current location for precise matching",
      });
    } catch (error) {
      console.error('GPS error:', error);
      toast({
        title: "Location access denied",
        description: "We'll use city-level matching instead",
        variant: "destructive",
      });
    } finally {
      setIsGeolocating(false);
    }
  };

  // Geocode the address to get coordinates
  const geocodeAddress = async (city: string, state: string, address?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { city, state, address }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Include "Other" cuisine if typed
      let finalCuisineStyles = [...formData.cuisineStyles];
      if (otherCuisine.trim() && !finalCuisineStyles.includes(otherCuisine.trim())) {
        finalCuisineStyles.push(otherCuisine.trim());
      }

      const validationResult = requestSchema.safeParse({
        flavorMoods: formData.flavorMoods,
        cuisineStyles: finalCuisineStyles,
        locationCity: formData.locationCity,
        locationState: formData.locationState,
        locationAddress: formData.locationAddress || undefined,
        additionalNotes: formData.additionalNotes || undefined,
        responseWindow: formData.responseWindow,
        lat: formData.lat,
        lng: formData.lng
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Invalid input",
          description: firstError.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const validated = validationResult.data;
      let lat = validated.lat;
      let lng = validated.lng;

      if (!lat || !lng) {
        const geocodeResult = await geocodeAddress(
          validated.locationCity,
          validated.locationState,
          validated.locationAddress
        );

        if (geocodeResult) {
          lat = geocodeResult.lat;
          lng = geocodeResult.lng;
        }
      }

      const foodTypeString = `${validated.flavorMoods.join(', ')} | ${validated.cuisineStyles.join(', ')}`;

      const { data, error } = await supabase
        .from('food_requests')
        .insert([{
          requester_id: user.id,
          food_type: foodTypeString,
          location_city: validated.locationCity,
          location_state: validated.locationState,
          location_address: validated.locationAddress || null,
          additional_notes: validated.additionalNotes || null,
          status: 'active',
          expire_at: new Date(Date.now() + validated.responseWindow * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.functions.invoke('notify-area-users', {
          body: { requestId: data.id }
        });
      } catch (notificationError) {
        console.error('Error notifying area users:', notificationError);
      }

      toast({
        title: "Request created!",
        description: lat && lng 
          ? "Your food request has been posted with precise location matching."
          : "Your food request has been posted with city-level matching.",
      });
      
      feedbackSessionManager.onNewRequestCreated();
      navigate(`/requests/${data.id}/results`);
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: "Failed to create your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to create a food request.</p>
          <Button onClick={() => navigate('/auth')} className="w-full sm:w-auto">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold truncate">Request Food</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 pb-24">
        <Card className="max-w-3xl mx-auto border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl">What are you craving today?</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Tell us your preferences and we'll find the best recommendations</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Flavor Mood Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Flavor Mood</h3>
                  <p className="text-sm text-muted-foreground">Select your taste preference</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {FLAVOR_MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => toggleFlavorMood(mood)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-center",
                        formData.flavorMoods.includes(mood)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
                {formData.flavorMoods.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one flavor mood</p>
                )}
              </div>

              {/* Cuisine Style Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cuisine Style</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred cuisine(s)</p>
                </div>
                
                {/* Cuisine Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3">
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      className={cn(
                        "px-3 py-3 rounded-xl text-sm font-medium transition-all border-2 text-center min-h-[48px]",
                        formData.cuisineStyles.includes(cuisine)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>

                {/* Anything Button & Other Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={selectAnything}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 text-center",
                      formData.cuisineStyles.includes('Anything') && formData.cuisineStyles.length === 1
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-accent text-accent-foreground border-primary hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    🌍 Anything
                  </button>
                  <Input
                    type="text"
                    placeholder="Other (type here)"
                    value={otherCuisine}
                    onChange={(e) => setOtherCuisine(e.target.value)}
                    className="h-12 rounded-xl border-2 border-border focus:border-primary text-sm"
                  />
                </div>

                {formData.cuisineStyles.length === 0 && !otherCuisine.trim() && (
                  <p className="text-xs text-destructive">Choose at least one cuisine or type your preference</p>
                )}
              </div>
              
              {/* Location Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Location</h3>
                    <p className="text-sm text-muted-foreground">Enter your city or use GPS</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGeolocating}
                    className="shrink-0 rounded-xl border-2 border-primary text-primary hover:bg-primary/10"
                  >
                    {isGeolocating ? (
                      <>
                        <MapPin className="h-4 w-4 mr-2 animate-pulse" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4 mr-2" />
                        Use my location
                      </>
                    )}
                  </Button>
                </div>
                <CityAutocomplete
                  value={locationInput}
                  onValueChange={setLocationInput}
                  onCitySelect={(city, state) => {
                    handleChange('locationCity', city);
                    handleChange('locationState', state);
                  }}
                  placeholder="Type a city name (e.g., Charlotte, Austin, etc.)"
                  className="h-12 rounded-xl border-2 border-border focus:border-primary"
                />
                {formData.lat && formData.lng && (
                  <div className="text-sm text-green-600 flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                    <MapPin className="h-4 w-4" />
                    GPS location captured for precise matching
                  </div>
                )}
              </div>
              
              {/* Additional Preferences */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Additional Preferences</h3>
                  <p className="text-sm text-muted-foreground">Diet, dislikes, budget, etc.</p>
                </div>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any specific preferences, dietary restrictions, budget range, etc."
                  value={formData.additionalNotes}
                  onChange={(e) => handleChange('additionalNotes', e.target.value)}
                  className="min-h-[100px] rounded-xl border-2 border-border focus:border-primary resize-none"
                />
              </div>
              
              {/* Response Time */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">How fast do you need recommendations?</Label>
                <RadioGroup
                  value={formData.responseWindow.toString()}
                  onValueChange={(value) => handleChange('responseWindow', parseInt(value))}
                  className="grid gap-3"
                >
                  <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 hover:bg-purple-100/50 transition-colors">
                    <RadioGroupItem value="1" id="lightning" />
                    <div className="flex items-center gap-2 flex-1">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <Label htmlFor="lightning" className="cursor-pointer flex-1">
                        <span className="font-medium text-purple-600">🚀 Lightning</span>
                        <span className="text-muted-foreground ml-2">- 1 minute</span>
                      </Label>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">Testing</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50/50 hover:bg-red-100/50 transition-colors">
                    <RadioGroupItem value="2" id="instant" />
                    <div className="flex items-center gap-2 flex-1">
                      <Zap className="h-4 w-4 text-red-500" />
                      <Label htmlFor="instant" className="cursor-pointer flex-1">
                        <span className="font-medium text-red-500">⚡ Instant</span>
                        <span className="text-muted-foreground ml-2">- 2 minutes</span>
                      </Label>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">Most Popular</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 transition-colors">
                    <RadioGroupItem value="5" id="quick" />
                    <div className="flex items-center gap-2 flex-1">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="quick" className="cursor-pointer flex-1">
                        <span className="font-medium text-orange-500">Quick</span>
                        <span className="text-muted-foreground ml-2">- 5 minutes</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 transition-colors">
                    <RadioGroupItem value="30" id="soon" />
                    <div className="flex items-center gap-2 flex-1">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <Label htmlFor="soon" className="cursor-pointer flex-1">
                        <span className="font-medium text-amber-600">Soon</span>
                        <span className="text-muted-foreground ml-2">- 30 minutes</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="120" id="extended" />
                    <div className="flex items-center gap-2 flex-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="extended" className="cursor-pointer flex-1">
                        <span className="font-medium">Extended</span>
                        <span className="text-muted-foreground ml-2">- 2 hours</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
                
                <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 border border-blue-200">
                  💡 <strong>Tip:</strong> Shorter windows get more urgent responses from nearby locals!
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || formData.flavorMoods.length === 0 || (formData.cuisineStyles.length === 0 && !otherCuisine.trim()) || !formData.locationCity || !formData.locationState}
                  className="flex-1 h-12 rounded-xl"
                >
                  {isSubmitting ? 'Creating...' : 'Post Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RequestFood;
