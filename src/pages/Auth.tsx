import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, ShieldCheck, Building2, Users, Star } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState<'regular' | 'business'>('regular');
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've been logged in successfully.",
          });
        }
      } else {
        // Validate business signup requirements
        if (userType === 'business' && !phoneNumber) {
          toast({
            title: "Phone Required",
            description: "Business accounts require a phone number for verification.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signUp(email, password, displayName, userType, phoneNumber);
        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created!",
            description: userType === 'business' 
              ? "Please complete business verification to access all features." 
              : "Please check your email to verify your account.",
          });
          
          // Redirect business users to onboarding flow
          if (userType === 'business') {
            navigate('/business/onboarding?from=signup');
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Welcome to Cravlr' : 'Join Cravlr'}
          </CardTitle>
          <p className="text-muted-foreground">
            {isLogin 
              ? 'Sign in to your account' 
              : 'Create your account to get started'
            }
          </p>
        </CardHeader>
        <CardContent>
          {isLogin && (
            <div className="mb-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your account type to continue
                </p>
              </div>
              
              <div className="grid gap-3">
                <div className="border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Food Lover Account</p>
                      <p className="text-xs text-muted-foreground">
                        Personal email • Discover restaurants • Earn rewards
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Business Account</p>
                      <p className="text-xs text-muted-foreground">
                        Business email • Track referrals • Manage restaurants
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Enter your credentials below to access either account type
                </p>
              </div>
            </div>
          )}

          {!isLogin && (
            <Tabs value={userType} onValueChange={(value) => setUserType(value as 'regular' | 'business')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="regular" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Food Lover
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="regular" className="mt-4 space-y-3">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Discover amazing restaurants and earn rewards for sharing great recommendations
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-1 justify-center">
                  <Badge variant="secondary" className="text-xs">Instant Access</Badge>
                  <Badge variant="secondary" className="text-xs">Earn Points</Badge>
                  <Badge variant="secondary" className="text-xs">Get Rewards</Badge>
                </div>
              </TabsContent>
              
              <TabsContent value="business" className="mt-4 space-y-3">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Claim your restaurant, track referrals, and grow your business through verified recommendations
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-1 justify-center">
                  <Badge variant="secondary" className="text-xs">Phone Verification</Badge>
                  <Badge variant="secondary" className="text-xs">Business Email</Badge>
                  <Badge variant="secondary" className="text-xs">Manual Review</Badge>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800 text-center">
                    <ShieldCheck className="h-3 w-3 inline mr-1" />
                    Business accounts require verification for security
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="How should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  required={userType === 'business'}
                  label={userType === 'business' ? 'Business Phone Number' : 'Phone Number'}
                  description={userType === 'business' ? 'Required for business verification' : 'For SMS notifications (optional)'}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {userType === 'business' ? 'Business Email' : 'Email'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={userType === 'business' ? 'contact@yourrestaurant.com' : 'your@email.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {!isLogin && userType === 'business' && (
                <p className="text-xs text-muted-foreground">
                  Use your business domain for faster verification
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 
                userType === 'business' ? 'Create & Verify Business Account' : 'Create Account')}
            </Button>
            
            {!isLogin && userType === 'business' && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  After signup, you'll need to complete phone verification and claim your restaurant
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;