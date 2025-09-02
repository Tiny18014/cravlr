import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FoodRequest {
  id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  location_address?: string;
  additional_notes?: string;
  status: string;
  created_at: string;
  expires_at: string;
  closed_at?: string;
  profiles: {
    display_name: string;
    email: string;
  };
  recommendation_count?: number;
  user_has_recommended?: boolean;
}

const BrowseRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FoodRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    restaurantName: '',
    note: '',
    link: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    try {
      // Fetch active requests with recommendation counts and user's recommendation status
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          profiles (display_name, email)
        `)
        .eq('status', 'active')
        .gt('expires_at', 'now()')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each request, get recommendation count and check if user has recommended
      const requestsWithCounts = await Promise.all(
        (data || []).map(async (request) => {
          // Get recommendation count
          const { count } = await supabase
            .from('recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', request.id);

          // Check if current user has already recommended
          let userHasRecommended = false;
          if (user) {
            const { data: userRec } = await supabase
              .from('recommendations')
              .select('id')
              .eq('request_id', request.id)
              .eq('recommender_id', user.id)
              .single();
            userHasRecommended = !!userRec;
          }

          return {
            ...request,
            recommendation_count: count || 0,
            user_has_recommended: userHasRecommended
          };
        })
      );

      setRequests(requestsWithCounts);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load food requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRecommendation = async () => {
    if (!selectedRequest || !user || !formData.restaurantName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .insert([{
          request_id: selectedRequest.id,
          recommender_id: user.id,
          restaurant_name: formData.restaurantName.trim(),
          notes: formData.note.trim() || null,
          restaurant_address: null,
          restaurant_phone: null,
          confidence_score: 5
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            requestId: selectedRequest.id,
            recommendationId: data.id
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Success!",
        description: "Your recommendation has been submitted",
      });

      // Reset form and close dialog
      setFormData({ restaurantName: '', note: '', link: '' });
      setSelectedRequest(null);
      
      // Refresh the requests list
      fetchRequests();
    } catch (error: any) {
      console.error('Error submitting recommendation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit recommendation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return "Expired";
    if (diffMins < 60) return `${diffMins}m left`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m left`;
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
          <h1 className="text-2xl font-bold">Nearby Requests</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Help Fellow Food Lovers!</h2>
            <p className="text-muted-foreground">
              Share your favorite restaurants and earn points for quick responses
            </p>
          </div>

          <div className="space-y-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No active food requests found nearby.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{request.food_type}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{formatTimeRemaining(request.expires_at)}</Badge>
                        {request.recommendation_count! >= 10 && (
                          <Badge variant="destructive">Full</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by {request.profiles.display_name || request.profiles.email}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {request.location_city}, {request.location_state}
                        {request.location_address && ` - ${request.location_address}`}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        Created {formatDate(request.created_at)}
                      </div>
                      {request.additional_notes && (
                        <p className="text-sm mt-2">{request.additional_notes}</p>
                      )}
                      <div className="flex justify-between items-center pt-4">
                        <div className="text-sm text-muted-foreground">
                          {request.recommendation_count}/10 recommendations
                        </div>
                        {request.user_has_recommended ? (
                          <Badge variant="outline">Already suggested</Badge>
                        ) : (
                          <Dialog open={selectedRequest?.id === request.id} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                disabled={request.recommendation_count! >= 10}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Suggest Spot
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Suggest a Restaurant</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="text-sm text-muted-foreground mb-4">
                                  Suggesting for: <strong>{request.food_type}</strong> in {request.location_city}, {request.location_state}
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="restaurantName">Restaurant Name *</Label>
                                  <Input
                                    id="restaurantName"
                                    placeholder="Enter restaurant name"
                                    value={formData.restaurantName}
                                    onChange={(e) => setFormData(prev => ({...prev, restaurantName: e.target.value}))}
                                    maxLength={80}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="note">Note (optional)</Label>
                                  <Textarea
                                    id="note"
                                    placeholder="Why do you recommend this place?"
                                    value={formData.note}
                                    onChange={(e) => setFormData(prev => ({...prev, note: e.target.value}))}
                                    maxLength={140}
                                    rows={3}
                                  />
                                  <div className="text-xs text-muted-foreground text-right">
                                    {formData.note.length}/140
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="link">Link (optional)</Label>
                                  <Input
                                    id="link"
                                    placeholder="Link to maps, website, etc."
                                    value={formData.link}
                                    onChange={(e) => setFormData(prev => ({...prev, link: e.target.value}))}
                                    type="url"
                                  />
                                </div>

                                <div className="flex gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRequest(null);
                                      setFormData({ restaurantName: '', note: '', link: '' });
                                    }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleSubmitRecommendation}
                                    disabled={!formData.restaurantName.trim() || isSubmitting}
                                    className="flex-1"
                                  >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BrowseRequests;