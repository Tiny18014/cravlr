import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Zap, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LocationAutocomplete, NormalizedLocation } from '@/components/LocationAutocomplete';
import { feedbackSessionManager } from '@/utils/feedbackSessionManager';
import { z } from 'zod';
import { DishTypeAutocomplete } from '@/components/DishTypeAutocomplete';
import { FlavorMoodAutocomplete } from '@/components/FlavorMoodAutocomplete';
import { CuisineAutocomplete } from '@/components/CuisineAutocomplete';


const requestSchema = z.object({
  dishType: z.string().optional(),
  flavorMood: z.string().optional(),
  cuisineStyle: z.string().optional(),
  locationCity: z.string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City name is too long'),
  // Region/State/Province - optional, free-form text for global support
  locationState: z.string()
    .trim()
    .max(150, 'Region name is too long')
    .optional()
    .or(z.literal('')),
  // Country code - optional, ISO-3166-1 alpha-2 if provided
  countryCode: z.string()
    .trim()
    .length(2, 'Country code must be 2 letters')
    .regex(/^[A-Z]{2}$/, 'Invalid country code')
    .optional()
    .or(z.literal('')),
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
  const [locationInput, setLocationInput] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [selectedDishType, setSelectedDishType] = useState<{ id: number; name: string } | null>(null);
  const [selectedFlavorMood, setSelectedFlavorMood] = useState<{ id: number; name: string } | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<{ id: number; name: string } | null>(null);
  
  const [formData, setFormData] = useState({
    locationCity: '',
    locationState: '',
    countryCode: '',
    locationAddress: '',
    additionalNotes: '',
    responseWindow: 2,
    lat: null as number | null,
    lng: null as number | null
  });

  // Goal 5: Prefill location from user profile
  useEffect(() => {
    const loadUserLocation = async () => {
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('location_city, location_state, profile_lat, profile_lng, profile_country')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile?.location_city) {
          const cityDisplay = profile.location_state 
            ? `${profile.location_city}, ${profile.location_state}`
            : profile.location_city;
          
          setLocationInput(cityDisplay);
          setFormData(prev => ({
            ...prev,
            locationCity: profile.location_city,
            locationState: profile.location_state || '',
            countryCode: profile.profile_country || '',
            lat: profile.profile_lat,
            lng: profile.profile_lng
          }));
        }
      } catch (error) {
        console.error('Error loading user location:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserLocation();
  }, [user?.id]);


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
      const validationResult = requestSchema.safeParse({
        dishType: selectedDishType?.name,
        flavorMood: selectedFlavorMood?.name,
        cuisineStyle: selectedCuisine?.name,
        locationCity: formData.locationCity,
        locationState: formData.locationState || undefined,
        countryCode: formData.countryCode || undefined,
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

      const dishPart = validated.dishType && validated.dishType !== 'Anything' ? `${validated.dishType} | ` : '';
      const flavorPart = validated.flavorMood && validated.flavorMood !== 'Anything' ? validated.flavorMood : 'Any Flavor';
      const cuisinePart = validated.cuisineStyle && validated.cuisineStyle !== 'Anything' ? validated.cuisineStyle : 'Any Cuisine';
      const foodTypeString = `${dishPart}${flavorPart} | ${cuisinePart}`;

      const { data, error } = await supabase
        .from('food_requests')
        .insert([{
          requester_id: user.id,
          food_type: foodTypeString,
          location_city: validated.locationCity,
          location_state: validated.locationState || '',
          location_address: validated.locationAddress || null,
          additional_notes: validated.additionalNotes || null,
          lat: lat,
          lng: lng,
          country_code: validated.countryCode || null,
          status: 'active',
          expire_at: new Date(Date.now() + validated.responseWindow * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      try {
        console.log('🔔 Triggering notify-area-users for request:', data.id);
        const { data: notifyData, error: notifyError } = await supabase.functions.invoke('notify-area-users', {
          body: { requestId: data.id }
        });

        if (notifyError) {
          console.error('❌ Error response from notify-area-users:', notifyError);
        } else {
          console.log('✅ Notification results:', notifyData);
        }
      } catch (notificationError) {
        console.error('❌ Exception notifying area users:', notificationError);
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
              {/* Dish Type Section */}
              <DishTypeAutocomplete 
                value={selectedDishType} 
                onSelect={setSelectedDishType} 
              />

              {/* Flavor Mood Section */}
              <FlavorMoodAutocomplete 
                value={selectedFlavorMood} 
                onSelect={setSelectedFlavorMood} 
              />

              {/* Cuisine Style Section */}
              <CuisineAutocomplete 
                value={selectedCuisine} 
                onSelect={setSelectedCuisine} 
              />
              
              {/* Location Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Location</h3>
                  <p className="text-sm text-muted-foreground">Search for your city, neighborhood, or use GPS</p>
                </div>
                <LocationAutocomplete
                  value={locationInput}
                  onValueChange={setLocationInput}
                  onLocationSelect={(location: NormalizedLocation) => {
                    handleChange('locationCity', location.city || location.displayLabel);
                    handleChange('locationState', location.region || '');
                    handleChange('countryCode', location.countryCode || '');
                    if (location.lat && location.lng) {
                      setFormData(prev => ({
                        ...prev,
                        lat: location.lat,
                        lng: location.lng
                      }));
                    }
                  }}
                  placeholder="Search city, neighborhood, or address..."
                  showGpsButton={true}
                  showMapPicker={true}
                  includeRestaurants={false}
                />
                {formData.lat && formData.lng && (
                  <div className="text-sm text-green-600 flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
                    <MapPin className="h-4 w-4" />
                    Location captured for precise matching
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
                  disabled={isSubmitting || !formData.locationCity}
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
