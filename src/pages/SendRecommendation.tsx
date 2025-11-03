import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { RestaurantSearchInput } from '@/components/RestaurantSearchInput';
import { EmailVerificationRequired } from '@/components/EmailVerificationRequired';
import { AppFeedbackTrigger } from '@/components/AppFeedbackTrigger';
import { useRateLimit } from '@/hooks/useRateLimit';
import { z } from 'zod';

interface FoodRequest {
  id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  location_address: string | null;
  additional_notes: string | null;
  profiles: {
    display_name: string;
  };
}

const recommendationSchema = z.object({
  restaurantName: z.string()
    .trim()
    .min(1, 'Restaurant name is required')
    .max(200, 'Restaurant name must be less than 200 characters'),
  restaurantAddress: z.string()
    .trim()
    .max(300, 'Address must be less than 300 characters')
    .optional(),
  notes: z.string()
    .trim()
    .max(1000, 'Notes must be less than 1,000 characters')
    .optional(),
  confidenceScore: z.number()
    .int()
    .min(1, 'Confidence score must be at least 1')
    .max(5, 'Confidence score cannot exceed 5'),
  placeId: z.string()
    .max(200, 'Place ID too long')
    .optional(),
  mapsUrl: z.string()
    .url('Invalid URL format')
    .max(500, 'URL too long')
    .optional()
    .or(z.literal(''))
});

const SendRecommendation = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkRateLimit, checking: rateLimitChecking } = useRateLimit();
  
  const [request, setRequest] = useState<FoodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [triggerAppFeedback, setTriggerAppFeedback] = useState(false);
  
  const [formData, setFormData] = useState({
    restaurantName: '',
    restaurantAddress: '',
    notes: '',
    confidenceScore: [4], // Default to 4/5 (matching database constraint)
    placeId: '', // For Google Places integration
    mapsUrl: '' // For storing the Google Maps URL
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!requestId) {
      navigate('/browse-requests');
      return;
    }
    
    fetchRequest();
  }, [user, requestId, navigate]);

  // Set user location based on request location for better search results
  useEffect(() => {
    if (request && request.location_city && request.location_state) {
      // Use the request location for restaurant search
      setUserLocation({
        lat: 35.4100756, // Default to request area coordinates
        lng: -80.5819527  // You might want to geocode the actual request location
      });
    }
  }, [request]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          profiles (
            display_name
          )
        `)
        .eq('id', requestId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request:', error);
      toast({
        title: "Error",
        description: "Failed to load the food request.",
        variant: "destructive",
      });
      navigate('/browse-requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !requestId) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate input
      const validatedData = recommendationSchema.parse({
        restaurantName: formData.restaurantName,
        restaurantAddress: formData.restaurantAddress,
        notes: formData.notes,
        confidenceScore: formData.confidenceScore[0],
        placeId: formData.placeId,
        mapsUrl: formData.mapsUrl
      });

      // Check rate limit
      const canRecommend = await checkRateLimit('create_recommendation', 10, 60);
      if (!canRecommend) {
        toast({
          title: "Too many recommendations",
          description: "Please wait before submitting more recommendations.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('recommendations')
        .insert({
          request_id: requestId,
          recommender_id: user.id,
          restaurant_name: validatedData.restaurantName,
          restaurant_address: validatedData.restaurantAddress || null,
          notes: validatedData.notes || null,
          confidence_score: validatedData.confidenceScore,
          ...(validatedData.placeId && { place_id: validatedData.placeId }),
          ...(validatedData.mapsUrl && { maps_url: validatedData.mapsUrl })
        });

      if (error) {
        // Handle duplicate recommendation error specifically
        if (error.code === '23505' && error.message.includes('recommendations_request_id_recommender_id_restaurant_name_key')) {
          toast({
            title: "Already recommended",
            description: `You've already recommended "${validatedData.restaurantName}" for this request. Try a different restaurant.`,
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Recommendation sent!",
        description: "Your recommendation has been shared with the requester.",
      });
      
      // Trigger app feedback after successful recommendation
      setTriggerAppFeedback(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error sending recommendation:', error);
        toast({
          title: "Error",
          description: "Failed to send your recommendation. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestaurantChange = (name: string, address: string, placeId?: string) => {
    // Generate Google Maps URL for the selected place
    let mapsUrl = null;
    if (placeId) {
      mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    } else if (name && address) {
      const query = encodeURIComponent(`${name} ${address}`);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    setFormData(prev => ({
      ...prev,
      restaurantName: name,
      restaurantAddress: address,
      placeId: placeId || '',
      mapsUrl: mapsUrl || ''
    }));
  };

  const handleChange = (field: string, value: string | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <h2 className="text-xl font-semibold mb-4">Request not found</h2>
            <p className="text-muted-foreground mb-6">
              This request may have expired or been removed.
            </p>
            <Button onClick={() => navigate('/browse-requests')}>
              Browse Other Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/browse-requests')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Send Recommendation</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Looking for:</strong> {request.food_type}</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {request.location_address ? 
                      `${request.location_address}, ${request.location_city}, ${request.location_state}` : 
                      `${request.location_city}, ${request.location_state}`
                    }
                  </span>
                </div>
                <p><strong>Requested by:</strong> {request.profiles?.display_name || 'Anonymous'}</p>
                {request.additional_notes && (
                  <div className="bg-muted/50 p-3 rounded-md mt-3">
                    <p className="text-sm"><strong>Additional notes:</strong> {request.additional_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendation Form */}
          <Card>
              <CardHeader>
                <CardTitle>Your Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="restaurantSearch">Restaurant Name *</Label>
                    <RestaurantSearchInput
                      value={formData.restaurantName}
                      onChange={handleRestaurantChange}
                      placeholder="Search for restaurants (e.g., Oli...)"
                      required
                      userLocation={userLocation}
                    />
                    {formData.restaurantAddress && (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          📍 {formData.restaurantAddress}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const query = encodeURIComponent(`${formData.restaurantName} ${formData.restaurantAddress}`);
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
                            // Use location.assign instead of window.open to avoid popup blockers
                            window.location.assign(mapsUrl);
                          }}
                          className="text-xs h-6"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Open in Maps
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="confidenceScore" className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Confidence Level: {formData.confidenceScore[0]}/5
                    </Label>
                    <div className="px-3 py-4">
                      <Slider
                        id="confidenceScore"
                        min={1}
                        max={5}
                        step={1}
                        value={formData.confidenceScore}
                        onValueChange={(value) => handleChange('confidenceScore', value)}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How confident are you in this recommendation? (1 = worth trying, 5 = absolutely amazing)
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Why do you recommend this place?</Label>
                    <Textarea
                      id="notes"
                      placeholder="Share what makes this place special - the food, atmosphere, service, etc."
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/browse-requests')}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || rateLimitChecking || !formData.restaurantName}
                      className="flex-1"
                    >
                      {isSubmitting || rateLimitChecking ? 'Sending...' : 'Send Recommendation'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
      </main>
      
      <AppFeedbackTrigger
        role="recommender"
        sourceAction="submitted_recommendation"
        shouldTrigger={triggerAppFeedback}
        onTriggered={() => setTriggerAppFeedback(false)}
        onComplete={() => navigate('/browse-requests')}
      />
    </div>
  );
};

export default SendRecommendation;