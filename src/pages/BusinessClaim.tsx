import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { RestaurantSearchInput } from '@/components/RestaurantSearchInput';
import { Building2, Mail, Phone, Globe, MapPin, User } from 'lucide-react';
import { EmailVerificationRequired } from '@/components/EmailVerificationRequired';

export default function BusinessClaim() {
  const navigate = useNavigate();
  const { submitBusinessClaim, loading } = useBusinessClaims();
  
  const [claimData, setClaimData] = useState({
    restaurant_name: '',
    place_id: '',
    business_email: '',
    business_phone: ''
  });

  const [profileData, setProfileData] = useState({
    business_name: '',
    contact_name: '',
    business_address: '',
    business_website: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimData.restaurant_name || !claimData.business_email) {
      return;
    }

    await submitBusinessClaim(claimData, profileData);
    navigate('/');
  };

  const handleRestaurantSelect = (restaurant: any) => {
    setClaimData(prev => ({
      ...prev,
      restaurant_name: restaurant.name,
      place_id: restaurant.place_id || ''
    }));
    setProfileData(prev => ({
      ...prev,
      business_name: restaurant.name,
      business_address: restaurant.formatted_address || restaurant.vicinity || ''
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <EmailVerificationRequired action="claim a business">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Claim Your Restaurant
            </CardTitle>
            <CardDescription>
              Take control of your restaurant's presence and start receiving customer recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Restaurant Selection */}
              <div className="space-y-2">
                <Label htmlFor="restaurant">Restaurant *</Label>
                <RestaurantSearchInput
                  value={claimData.restaurant_name}
                  onChange={handleRestaurantSelect}
                  placeholder="Search for your restaurant..."
                />
                {claimData.restaurant_name && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {claimData.restaurant_name}
                  </p>
                )}
              </div>

              {/* Business Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="business_email">Business Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="business_email"
                      type="email"
                      required
                      value={claimData.business_email}
                      onChange={(e) => setClaimData(prev => ({
                        ...prev,
                        business_email: e.target.value
                      }))}
                      placeholder="restaurant@example.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use your restaurant's official email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="business_phone"
                      type="tel"
                      value={claimData.business_phone}
                      onChange={(e) => setClaimData(prev => ({
                        ...prev,
                        business_phone: e.target.value
                      }))}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Business Profile */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Business Profile</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Person</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="contact_name"
                      value={profileData.contact_name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        contact_name: e.target.value
                      }))}
                      placeholder="Your name"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                    <Textarea
                      id="business_address"
                      value={profileData.business_address}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        business_address: e.target.value
                      }))}
                      placeholder="Full business address"
                      className="pl-10 min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_website">Website (Optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="business_website"
                      type="url"
                      value={profileData.business_website}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        business_website: e.target.value
                      }))}
                      placeholder="https://yourrestaurant.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Verification Notice */}
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Verification Process</h3>
                <p className="text-sm text-muted-foreground">
                  All restaurant claims undergo manual verification. You'll receive an email notification 
                  once your claim is reviewed (typically within 1-2 business days).
                </p>
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
                  disabled={loading || !claimData.restaurant_name || !claimData.business_email}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </EmailVerificationRequired>
    </div>
  );
}