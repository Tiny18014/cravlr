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
            clearValidating(); // Clear validation state on error
            toast({
              title: "Access Error", 
              description: "Unable to verify account type.",
              variant: "destructive",
            });
            return;
          }
          
          if (businessClaims && businessClaims.length > 0) {
            console.log('🚫 Business account trying to access food lover login');
            // Sign out the user since they're on wrong platform
            await supabase.auth.signOut();
            clearValidating(); // Clear validation state
            toast({
              title: "Wrong Account Type",
              description: "This is a Business account. Please use the Business Owner sign-in.",
              variant: "destructive",
            });
            return;
          }
          
          console.log('✅ Food lover account confirmed, navigating to main app');
          clearValidating(); // Clear validation state before navigation
          toast({
            title: "Welcome back!",
            description: "You've been logged in successfully.",
          });
          // Redirect food lovers directly to the main app
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, displayName, 'regular');
        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account.",
          });
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
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Food Lover {isLogin ? 'Sign In' : 'Sign Up'}
          </CardTitle>
          
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Welcome back! Sign in to continue your foodie journey' 
                : 'Join the community and start discovering amazing restaurants'
              }
            </p>
            
            {!isLogin && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Instant access • No verification needed</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
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
                onClick={() => setIsLogin(!isLogin)}
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