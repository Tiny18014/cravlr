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

  const handleRestaurantSelect = (name: string, address: string, placeId?: string) => {
    setClaimData(prev => ({
      ...prev,
      restaurant_name: name,
      place_id: placeId || ''
    }));
    
    if (address) {
      setProfileData(prev => ({
        ...prev,
        business_address: address
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!claimData.restaurant_name || !claimData.business_email || !profileData.business_name || !profileData.contact_name) {
      return;
    }

    const success = await submitBusinessClaim(claimData, profileData);
    if (success) {
      navigate('/business/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">Claim Your Restaurant</h1>
          <p className="text-muted-foreground">
            Join our platform to track referrals, manage your restaurant profile, and earn commissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Restaurant Claim Form</CardTitle>
            <CardDescription>
              Fill out the form below to claim ownership of your restaurant. All claims are manually verified.
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

              {/* Business Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business_name"
                      placeholder="Your business name"
                      value={profileData.business_name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        business_name: e.target.value
                      }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contact_name"
                      placeholder="Your full name"
                      value={profileData.contact_name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        contact_name: e.target.value
                      }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_email">Business Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business_email"
                      type="email"
                      placeholder="contact@restaurant.com"
                      value={claimData.business_email}
                      onChange={(e) => setClaimData(prev => ({
                        ...prev,
                        business_email: e.target.value
                      }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business_phone"
                      placeholder="+1 (555) 123-4567"
                      value={claimData.business_phone}
                      onChange={(e) => setClaimData(prev => ({
                        ...prev,
                        business_phone: e.target.value
                      }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Address and Website */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="business_address"
                      placeholder="Your restaurant's full address"
                      value={profileData.business_address}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        business_address: e.target.value
                      }))}
                      className="pl-10 min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business_website"
                      placeholder="https://yourrestaurant.com"
                      value={profileData.business_website}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        business_website: e.target.value
                      }))}
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
      </div>
    </div>
  );
}