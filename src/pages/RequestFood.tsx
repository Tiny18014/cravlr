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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Zap, Calendar } from 'lucide-react';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const RequestFood = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    foodType: '',
    locationCity: '',
    locationState: '',
    locationAddress: '',
    additionalNotes: '',
    responseWindow: 120 // Default: Extended (2 hours)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('food_requests')
        .insert({
          requester_id: user.id,
          food_type: formData.foodType,
          location_city: formData.locationCity,
          location_state: formData.locationState,
          location_address: formData.locationAddress || null,
          additional_notes: formData.additionalNotes || null,
          response_window: formData.responseWindow
        });

      if (error) throw error;

      toast({
        title: "Request created!",
        description: "Your food request has been posted. Locals will start sending recommendations soon.",
      });
      
      navigate('/');
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
    navigate('/auth');
    return null;
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="locationCity">City</Label>
                  <Input
                    id="locationCity"
                    placeholder="Your city"
                    value={formData.locationCity}
                    onChange={(e) => handleChange('locationCity', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="locationState">State</Label>
                  <Select value={formData.locationState} onValueChange={(value) => handleChange('locationState', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="locationAddress">Specific area (optional)</Label>
                <Input
                  id="locationAddress"
                  placeholder="Neighborhood, street, or specific area"
                  value={formData.locationAddress}
                  onChange={(e) => handleChange('locationAddress', e.target.value)}
                />
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
                        <span className="font-medium">Extended</span> - 2 hours (default)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
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