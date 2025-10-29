import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Star, Mail } from 'lucide-react';

const AuthFoodlover = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'requester' | 'recommender' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn, user, clearValidating } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Food lovers always go to the main app
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
          console.log('🍕 Food Lover login successful, checking user type...');
          
          // Check if user has business claims - food lovers should NOT have any
          const { data: businessClaims, error: claimsError } = await supabase
            .from('business_claims')
            .select('id, status')
            .eq('status', 'verified');
            
          if (claimsError) {
            console.error('Error checking business claims:', claimsError);
            clearValidating();
            toast({
              title: "Access Error", 
              description: "Unable to verify account type.",
              variant: "destructive",
            });
            return;
          }
          
          if (businessClaims && businessClaims.length > 0) {
            console.log('🚫 Business account trying to access food lover login');
            await supabase.auth.signOut();
            clearValidating();
            toast({
              title: "Wrong Account Type",
              description: "This is a Business account. Please use the Business Owner sign-in.",
              variant: "destructive",
            });
            return;
          }
          
          console.log('✅ Food lover account confirmed, navigating to main app');
          clearValidating();
          toast({
            title: "Welcome back!",
            description: "You've been logged in successfully.",
          });
          navigate('/');
        }
      } else {
        // Signup flow
        if (!selectedRole) {
          toast({
            title: "Please select a role",
            description: "Choose whether you want to request or recommend food.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, displayName, 'regular');
        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Get the newly created user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Assign role to user_roles table
            const { error: roleError } = await supabase.rpc('assign_user_role', {
              _user_id: user.id,
              _role: selectedRole
            });

            if (roleError) {
              console.error('Error assigning role:', roleError);
            }

            // Update profile with display name
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ display_name: displayName })
              .eq('user_id', user.id);

            if (profileError) {
              console.error('Error updating profile:', profileError);
            }
          }

          toast({
            title: "Account Created!",
            description: `Welcome to Cravlr! Let's set up your ${selectedRole} profile.`,
          });

          // Route to onboarding based on role
          if (selectedRole === 'requester') {
            navigate('/onboarding/requester');
          } else {
            navigate('/onboarding/recommender');
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


  // Show role selection if signing up and no role selected yet
  if (!isLogin && !selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')} className="absolute left-4 top-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            
            <CardTitle className="text-2xl font-bold">
              Choose Your Role
            </CardTitle>
            
            <p className="text-muted-foreground">
              How would you like to use Cravlr?
            </p>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <Button 
              onClick={() => setSelectedRole('requester')}
              className="w-full h-auto py-4 flex flex-col items-start gap-2"
              variant="outline"
            >
              <span className="font-semibold text-lg">Sign up as Food Requester</span>
              <span className="text-sm text-muted-foreground font-normal">
                Get personalized food recommendations from locals
              </span>
            </Button>
            
            <Button 
              onClick={() => setSelectedRole('recommender')}
              className="w-full h-auto py-4 flex flex-col items-start gap-2"
              variant="outline"
            >
              <span className="font-semibold text-lg">Sign up as Food Recommender</span>
              <span className="text-sm text-muted-foreground font-normal">
                Share your favorite spots and earn rewards
              </span>
            </Button>

            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setIsLogin(true)}
                className="text-sm"
              >
                Already have an account? Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (!isLogin && selectedRole) {
                  setSelectedRole(null);
                } else {
                  navigate('/welcome');
                }
              }} 
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Sign In' : `${selectedRole === 'requester' ? 'Food Requester' : 'Food Recommender'} Sign Up`}
          </CardTitle>
          
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Welcome back! Sign in to continue your foodie journey' 
                : selectedRole === 'requester'
                  ? 'Get trusted recommendations from food lovers in your area'
                  : 'Share your expertise and help others discover great food'
              }
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsLogin(!isLogin);
                  if (!isLogin) setSelectedRole(null);
                }}
                className="text-sm"
              >
                {isLogin 
                  ? "New to Cravlr? Create your account" 
                  : "Already have an account? Sign in"
                }
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Looking for business features?{' '}
                <Link to="/auth/business" className="text-primary hover:underline font-medium">
                  Switch to Business Account
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthFoodlover;