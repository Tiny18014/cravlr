import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from '@/components/PhoneInput';
import { validateEmail } from '@/utils/emailValidation';

const AuthFoodlover = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  
  const MIN_PASSWORD_LENGTH = 6;
  
  const { signUp, signIn, user, clearValidating } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Debounce helper
  const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout | null = null;
    return ((...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  };

  // Real-time email verification using Abstract API
  const verifyEmailRealtime = useCallback(async (emailToVerify: string) => {
    // First do basic format validation
    const basicResult = validateEmail(emailToVerify);
    if (!basicResult.isValid) {
      setEmailError(basicResult.error);
      setIsEmailVerified(false);
      return;
    }

    setIsVerifyingEmail(true);
    setIsEmailVerified(false);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-exists', {
        body: { email: emailToVerify }
      });

      if (error) {
        console.error('Email verification error:', error);
        setIsEmailVerified(false);
        return;
      }

      if (data.isValid) {
        setEmailError(null);
        setIsEmailVerified(true);
        
        // Show suggestion if available
        if (data.suggestion) {
          setEmailError(`Did you mean ${data.suggestion}?`);
        }
      } else {
        setEmailError(data.error || 'Invalid email address');
        setIsEmailVerified(false);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setIsEmailVerified(false);
    } finally {
      setIsVerifyingEmail(false);
    }
  }, []);

  // Debounced email verification (wait 800ms after user stops typing)
  const debouncedEmailVerify = useCallback(
    debounce((emailToVerify: string) => {
      verifyEmailRealtime(emailToVerify);
    }, 800),
    [verifyEmailRealtime]
  );

  // Clear error when user starts typing
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setIsEmailVerified(false);
    if (loginError) setLoginError(null);
    if (emailError) setEmailError(null);
    
    // For signup, trigger real-time verification
    if (!isLogin && value.includes('@')) {
      debouncedEmailVerify(value);
    }
  };

  const handleValidateEmail = (email: string): boolean => {
    const result = validateEmail(email);
    if (!result.isValid) {
      setEmailError(result.error);
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (loginError) setLoginError(null);
    if (passwordError) setPasswordError(null);
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format before proceeding
    if (!handleValidateEmail(email)) {
      return;
    }
    
    // Validate password on signup
    if (!isLogin && !validatePassword(password)) {
      return;
    }
    
    // Check for phone validation errors (only for signup)
    if (!isLogin && phoneError) {
      return;
    }
    
    setLoading(true);

    // For signup, verify email exists (skip if already verified via real-time check)
    if (!isLogin && !isEmailVerified) {
      try {
        const { data, error } = await supabase.functions.invoke('verify-email-exists', {
          body: { email }
        });
        
        if (error || !data?.isValid) {
          setEmailError(data?.error || 'Please enter a valid email address');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Email verification failed:', err);
        // Continue with signup attempt
      }
    }

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          clearValidating();
          // Display login error - don't reveal whether account exists for security
          setLoginError('Invalid email or password. Please try again.');
          setLoading(false);
          return;
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
        const { error } = await signUp(email, password, displayName, 'regular', phoneNumber || undefined);
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

            // Update profile with display name
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ 
                display_name: displayName
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] px-4 pt-10 sm:pt-4">
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
          {loginError && isLogin && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
              <div className="space-y-4">
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
                
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  onValidationChange={(isValid, error) => setPhoneError(error)}
                  required={true}
                  description="For SMS notifications about your food requests"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  className={`pr-10 ${emailError ? 'border-destructive' : isEmailVerified ? 'border-emerald-500' : ''}`}
                />
                {isVerifyingEmail && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {isEmailVerified && !isVerifyingEmail && !emailError && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                )}
              </div>
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
              {isEmailVerified && !emailError && !isLogin && (
                <p className="text-xs text-emerald-600">Email verified ✓</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                minLength={6}
                className={passwordError ? 'border-destructive' : ''}
              />
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
              {!isLogin && !passwordError && (
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <GoogleSignInButton />
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