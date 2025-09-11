import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Shield, Phone, Mail, ShieldCheck } from 'lucide-react';

const AuthBusiness = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
            description: "Redirecting to your business dashboard...",
          });
          // Redirect business login directly to business dashboard
          navigate('/business/dashboard');
        }
      } else {
        // Validate business signup requirements
        if (!phoneNumber) {
          toast({
            title: "Phone Required",
            description: "Business accounts require a phone number for verification.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signUp(email, password, displayName, 'business');
        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Business Account Created!",
            description: "Please complete business verification to access all features.",
          });
          
          // Redirect business users to onboarding flow
          navigate('/business/onboarding?from=signup');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')} className="absolute left-4 top-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Business {isLogin ? 'Sign In' : 'Registration'}
          </CardTitle>
          
          <div className="space-y-3">
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Welcome back! Access your business dashboard' 
                : 'Register your business and start tracking referrals'
              }
            </p>
            
            {!isLogin && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">Secure verification process</span>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-blue-800">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Business accounts require verification for security</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {!isLogin && (
            <div className="mb-6 space-y-3">
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" className="text-xs">Phone Verification</Badge>
                <Badge variant="secondary" className="text-xs">Business Email</Badge>
                <Badge variant="secondary" className="text-xs">Manual Review</Badge>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Business Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your Restaurant Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Business Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required={!isLogin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for business verification
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Business Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@yourrestaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {!isLogin && (
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
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? 'Loading...' : (isLogin ? 'Sign In to Dashboard' : 'Create & Verify Business Account')}
            </Button>
            
            {!isLogin && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  After signup, you'll complete phone verification and claim your restaurant
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm"
              >
                {isLogin 
                  ? "New business? Register your restaurant" 
                  : "Already registered? Sign in"
                }
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Just looking for food?{' '}
                <Link to="/auth/foodlover" className="text-primary hover:underline font-medium">
                  Switch to Food Lover Account
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthBusiness;