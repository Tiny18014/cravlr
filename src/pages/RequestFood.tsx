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
import { ArrowLeft, Clock, Zap, Calendar, MapPin, Navigation, ChevronDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { feedbackSessionManager } from '@/utils/feedbackSessionManager';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const FLAVOR_MOODS = [
  'Spicy', 'Sweet', 'Savory/Umami', 'Sour/Tangy', 'Salty', 'Fresh/Light', 'Rich/Creamy', 'Anything'
] as const;

const CUISINE_OPTIONS = [
  'Anything',
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai',
  'Mediterranean', 'Middle Eastern', 'Korean', 'Vietnamese', 'French', 'Spanish',
  'African', 'Latin/Caribbean', 'Brazilian', 'BBQ', 'Seafood', 'Pizza & Pasta',
  'Desserts/Bakeries', 'Vegan/Vegetarian'
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
  
  const [formData, setFormData] = useState({
    flavorMoods: [] as string[],
    cuisineStyles: [] as string[],
    locationCity: '',
    locationState: '',
    locationAddress: '',
    additionalNotes: '',
    responseWindow: 2, // Default: Instant (2 minutes) - most popular
    lat: null as number | null,
    lng: null as number | null
  });
  const [cuisineDropdownOpen, setCuisineDropdownOpen] = useState(false);

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

  // Get user's current location
  const getCurrentLocation = async () => {
    setIsGeolocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('📍 GPS location captured:', { lat: latitude, lng: longitude });
      
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
      console.log('🗺️ Geocoding address:', { city, state, address });
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { city, state, address }
      });

      if (error) throw error;

      console.log('✅ Geocoding successful:', data);
      return data;
    } catch (error) {
      console.error('❌ Geocoding failed:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {

      // Validate input with zod schema
      const validationResult = requestSchema.safeParse({
        flavorMoods: formData.flavorMoods,
        cuisineStyles: formData.cuisineStyles,
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

      // If we don't have GPS coordinates, try to geocode the address
      if (!lat || !lng) {
        console.log('🗺️ No GPS coordinates, attempting geocoding...');
        const geocodeResult = await geocodeAddress(
          validated.locationCity,
          validated.locationState,
          validated.locationAddress
        );

        if (geocodeResult) {
          lat = geocodeResult.lat;
          lng = geocodeResult.lng;
          console.log('✅ Using geocoded coordinates:', { lat, lng });
        } else {
          console.log('⚠️ Geocoding failed, proceeding without coordinates');
        }
      }

      // Build food_type string from selections
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

      console.log('✅ Request created:', {
        id: data.id
      });

      // Notify users in the area about the new request
      try {
        console.log('📧 Notifying area users about new request:', data.id);
        await supabase.functions.invoke('notify-area-users', {
          body: { requestId: data.id }
        });
      } catch (notificationError) {
        console.error('Error notifying area users:', notificationError);
        // Don't fail the request creation if notifications fail
      }

      toast({
        title: "Request created!",
        description: lat && lng 
          ? "Your food request has been posted with precise location matching."
          : "Your food request has been posted with city-level matching.",
      });
      
      // Reset feedback flags for new request flow
      feedbackSessionManager.onNewRequestCreated();
      
      // Navigate to the results page
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to create a food request.</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Request Food</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">What are you craving?</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Flavor Mood Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Flavor Mood</h3>
                  <p className="text-sm text-muted-foreground">Select a taste profile.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FLAVOR_MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => toggleFlavorMood(mood)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                        formData.flavorMoods.includes(mood)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
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
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cuisine Style</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred cuisine.</p>
                </div>
                <Popover open={cuisineDropdownOpen} onOpenChange={setCuisineDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left font-normal h-auto min-h-[44px] py-3 px-4 rounded-lg border-input hover:bg-accent/50 hover:border-primary/50 transition-all duration-200"
                    >
                      <span className="flex-1 truncate text-sm">
                        {formData.cuisineStyles.length > 0
                          ? formData.cuisineStyles.length === 1
                            ? formData.cuisineStyles[0]
                            : `${formData.cuisineStyles.length} cuisines selected`
                          : "Select cuisines..."}
                      </span>
                      <ChevronDown className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        cuisineDropdownOpen && "rotate-180"
                      )} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border shadow-lg rounded-lg overflow-hidden" 
                    align="start"
                  >
                    <div className="max-h-[280px] overflow-y-auto p-1.5">
                      {CUISINE_OPTIONS.map((cuisine) => (
                        <div
                          key={cuisine}
                          className="flex items-center space-x-3 px-3 py-2.5 hover:bg-accent/60 rounded-md cursor-pointer transition-colors duration-150"
                          onClick={() => toggleCuisine(cuisine)}
                        >
                          <Checkbox
                            checked={formData.cuisineStyles.includes(cuisine)}
                            onCheckedChange={() => toggleCuisine(cuisine)}
                            className="border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className="text-sm text-foreground">{cuisine}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {formData.cuisineStyles.length === 0 && (
                  <p className="text-xs text-destructive">Choose at least one cuisine before submitting.</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Location</h3>
                  <p className="text-sm text-muted-foreground">Enter your city.</p>
                </div>
                <CityAutocomplete
                  value={locationInput}
                  onValueChange={setLocationInput}
                  onCitySelect={(city, state) => {
                    handleChange('locationCity', city);
                    handleChange('locationState', state);
                  }}
                  placeholder="Type a city name (e.g., Charlotte, Austin, etc.)"
                  className="w-full h-auto min-h-[44px] py-3 px-4 rounded-lg border border-input hover:border-primary/50 focus:border-primary transition-all duration-200"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Specific Area</h3>
                    <p className="text-sm text-muted-foreground">Neighborhood or street (optional).</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGeolocating}
                    className="text-sm rounded-lg"
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
                <Input
                  id="locationAddress"
                  placeholder="Neighborhood, street, or specific area"
                  value={formData.locationAddress}
                  onChange={(e) => handleChange('locationAddress', e.target.value)}
                  className="w-full h-auto min-h-[44px] py-3 px-4 rounded-lg border border-input hover:border-primary/50 focus:border-primary transition-all duration-200"
                />
                {formData.lat && formData.lng && (
                  <div className="text-sm text-green-600 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    GPS location captured for precise matching
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Additional Preferences</h3>
                  <p className="text-sm text-muted-foreground">Diet, dislikes, budget, etc.</p>
                </div>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any specific preferences, dietary restrictions, budget range, etc."
                  value={formData.additionalNotes}
                  onChange={(e) => handleChange('additionalNotes', e.target.value)}
                  className="w-full min-h-[80px] py-3 px-4 rounded-lg border border-input hover:border-primary/50 focus:border-primary transition-all duration-200 resize-none"
                />
              </div>
              
               <div>
                <Label>How fast do you need recommendations?</Label>
                <RadioGroup
                  value={formData.responseWindow.toString()}
                  onValueChange={(value) => handleChange('responseWindow', parseInt(value))}
                  className="mt-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
                    <RadioGroupItem value="1" id="lightning" />
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <Label htmlFor="lightning" className="cursor-pointer">
                        <span className="font-medium text-purple-500">🚀 Lightning</span> - 1 minute
                      </Label>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">Testing</Badge>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                    <RadioGroupItem value="2" id="instant" />
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-red-500" />
                      <Label htmlFor="instant" className="cursor-pointer">
                        <span className="font-medium text-red-500">⚡ Instant</span> - 2 minutes
                      </Label>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">Most Popular</Badge>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <RadioGroupItem value="5" id="quick" />
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-destructive" />
                      <Label htmlFor="quick" className="cursor-pointer">
                        <span className="font-medium text-destructive">Quick</span> - 5 minutes
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                    <RadioGroupItem value="30" id="soon" />
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="soon" className="cursor-pointer">
                        <span className="font-medium text-orange-500">Soon</span> - 30 minutes
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-muted-foreground/20 bg-muted/50">
                    <RadioGroupItem value="120" id="extended" />
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="extended" className="cursor-pointer">
                        <span className="font-medium">Extended</span> - 2 hours
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  💡 <strong>Tip:</strong> Shorter windows get more urgent responses from nearby locals!
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || formData.flavorMoods.length === 0 || formData.cuisineStyles.length === 0 || !formData.locationCity || !formData.locationState}
                  className="flex-1"
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