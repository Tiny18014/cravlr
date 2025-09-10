import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useRequestNotifications } from '@/hooks/useRequestNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Zap, Calendar, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CityAutocomplete } from '@/components/CityAutocomplete';


const RequestFood = () => {
  const { user } = useAuth();
  const { dndEnabled } = useRequestNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  
  const [formData, setFormData] = useState({
    foodType: '',
    locationCity: '',
    locationState: '',
    locationAddress: '',
    additionalNotes: '',
    responseWindow: 2, // Default: Instant (2 minutes) - most popular
    lat: null as number | null,
    lng: null as number | null
  });

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
      let lat = formData.lat;
      let lng = formData.lng;

      // If we don't have GPS coordinates, try to geocode the address
      if (!lat || !lng) {
        console.log('🗺️ No GPS coordinates, attempting geocoding...');
        const geocodeResult = await geocodeAddress(
          formData.locationCity,
          formData.locationState,
          formData.locationAddress
        );

        if (geocodeResult) {
          lat = geocodeResult.lat;
          lng = geocodeResult.lng;
          console.log('✅ Using geocoded coordinates:', { lat, lng });
        } else {
          console.log('⚠️ Geocoding failed, proceeding without coordinates');
        }
      }

      const { data, error } = await supabase
        .from('food_requests')
        .insert({
          requester_id: user.id,
          food_type: formData.foodType,
          location_city: formData.locationCity,
          location_state: formData.locationState,
          location_address: formData.locationAddress || null,
          additional_notes: formData.additionalNotes || null,
          response_window: formData.responseWindow,
          location_lat: lat,
          location_lng: lng,
          status: 'active'  // 🔥 CRITICAL: Explicitly set to make visible to others
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Request created with coordinates:', {
        id: data.id,
        lat: data.location_lat,
        lng: data.location_lng
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

      // Request created successfully - requester should wait for recommendations from others
      // No need to redirect to recommendation page since they can't recommend for their own request

      toast({
        title: "Request created!",
        description: lat && lng 
          ? "Your food request has been posted with precise location matching."
          : "Your food request has been posted with city-level matching.",
      });
      
      // Navigate to dashboard to wait for the recommendation delay
      navigate('/dashboard');
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
              <div>
                <Label htmlFor="foodType">What type of food?</Label>
                <Input
                  id="foodType"
                  placeholder="e.g., Italian, Tacos, Sushi, BBQ..."
                  value={formData.foodType}
                  onChange={(e) => handleChange('foodType', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="location-input">Location</Label>
                  <CityAutocomplete
                    value={locationInput}
                    onValueChange={setLocationInput}
                    onCitySelect={(city, state) => {
                      handleChange('locationCity', city);
                      handleChange('locationState', state);
                    }}
                    placeholder="Type a city name (e.g., Charlotte, Austin, etc.)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your city to find nearby food lovers who can help with recommendations.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="locationAddress">Specific area (optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGeolocating}
                    className="text-sm"
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
                />
                {formData.lat && formData.lng && (
                  <div className="text-sm text-green-600 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    GPS location captured for precise matching
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="additionalNotes">Additional preferences (optional)</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any specific preferences, dietary restrictions, budget range, etc."
                  value={formData.additionalNotes}
                  onChange={(e) => handleChange('additionalNotes', e.target.value)}
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
                  disabled={isSubmitting || !formData.foodType || !formData.locationCity || !formData.locationState}
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