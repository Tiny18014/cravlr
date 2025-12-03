import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Mail, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const CUISINE_OPTIONS = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai',
  'Mediterranean', 'Middle Eastern', 'Korean', 'Vietnamese', 'French', 'Spanish',
  'African', 'Latin/Caribbean', 'Brazilian', 'BBQ', 'Seafood', 'Pizza & Pasta',
  'Bakery/Desserts', 'Vegan/Vegetarian'
];

const AuthFoodlover = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineDropdownOpen, setCuisineDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn, user, clearValidating } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && selectedCuisines.length === 0) {
      toast({
        title: "Cuisine Required",
        description: "Please select at least one cuisine you specialize in.",
        variant: "destructive",
      });
      return;
    }
    
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
        // Signup flow - all users get both requester and recommender roles
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
            // Assign both requester and recommender roles using self-assignment function
            const { error: roleError } = await supabase.rpc('self_assign_initial_roles');

            if (roleError) {
              console.error('Error assigning roles:', roleError);
            }

            // Update profile with display name and cuisine expertise
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ 
                display_name: displayName,
                cuisine_expertise: selectedCuisines
              })
              .eq('id', user.id);

            if (profileError) {
              console.error('Error updating profile:', profileError);
            }
          }

          toast({
            title: "Account Created!",
            description: "Welcome to Cravlr! You can now request and recommend food.",
          });

          navigate('/onboarding/requester');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/welcome')} 
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Sign In' : 'Create Account'}
          </CardTitle>
          
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Welcome back! Sign in to continue your foodie journey' 
                : 'Join Cravlr to request and recommend great food'
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

            {!isLogin && (
              <div className="space-y-2">
                <Label>Your Food Expertise <span className="text-destructive">*</span></Label>
                <Popover open={cuisineDropdownOpen} onOpenChange={setCuisineDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cuisineDropdownOpen}
                      className="w-full justify-between font-normal h-auto min-h-10"
                    >
                      <span className="truncate text-left flex-1">
                        {selectedCuisines.length === 0 
                          ? "Select cuisines you specialize in..."
                          : selectedCuisines.length <= 3
                            ? selectedCuisines.join(', ')
                            : `${selectedCuisines.slice(0, 3).join(', ')} +${selectedCuisines.length - 3} more`
                        }
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border" align="start">
                    <div className="max-h-60 overflow-y-auto p-2">
                      {CUISINE_OPTIONS.map((cuisine) => (
                        <div
                          key={cuisine}
                          className={cn(
                            "flex items-center space-x-2 px-2 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                            selectedCuisines.includes(cuisine) && "bg-primary/10"
                          )}
                          onClick={() => toggleCuisine(cuisine)}
                        >
                          <Checkbox
                            id={cuisine}
                            checked={selectedCuisines.includes(cuisine)}
                            onCheckedChange={() => toggleCuisine(cuisine)}
                          />
                          <label
                            htmlFor={cuisine}
                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                          >
                            {cuisine}
                          </label>
                          {selectedCuisines.includes(cuisine) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Select at least one cuisine (required)
                </p>
              </div>
            )}

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