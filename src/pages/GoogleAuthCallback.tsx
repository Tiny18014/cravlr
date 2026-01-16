import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Store, Loader2, CheckCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectingRole, setSelectingRole] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      
      console.log('[Auth Callback] ═══════════════════════════════════════');
      console.log('[Auth Callback] Google OAuth Callback Handler');
      console.log('[Auth Callback] Platform:', platform);
      console.log('[Auth Callback] Is Native:', isNative);
      console.log('[Auth Callback] Current URL:', window.location.href);
      console.log('[Auth Callback] Hash:', window.location.hash ? 'Present' : 'None');
      console.log('[Auth Callback] ═══════════════════════════════════════');

      try {
        // Get the session from URL hash (Supabase OAuth callback)
        console.log('[Auth Callback] Fetching session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth Callback] Session error:', error);
          toast({
            title: "Authentication Failed",
            description: "Unable to complete Google sign-in. Please try again.",
            variant: "destructive",
          });
          navigate('/welcome');
          return;
        }

        if (!session?.user) {
          console.log('[Auth Callback] No session found');
          console.log('[Auth Callback] Redirecting to welcome...');
          navigate('/welcome');
          return;
        }

        const user = session.user;
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');

        console.log('[Auth Callback] ✓ Session found!');
        console.log('[Auth Callback] User email:', user.email);
        console.log('[Auth Callback] User ID:', user.id);
        console.log('[Auth Callback] User name:', user.user_metadata?.full_name);

        // Check if user already has a role assigned or is a business user
        console.log('[Auth Callback] Checking user roles...');
        const [rolesResult, businessResult] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', user.id),
          supabase.from('business_claims').select('id, status').eq('user_id', user.id).eq('status', 'verified').limit(1)
        ]);

        const hasRoles = rolesResult.data && rolesResult.data.length > 0;
        const isBusinessUser = businessResult.data && businessResult.data.length > 0;

        console.log('[Auth Callback] User status check:');
        console.log('[Auth Callback]   - Has roles:', hasRoles);
        console.log('[Auth Callback]   - Is business user:', isBusinessUser);
        console.log('[Auth Callback]   - Roles:', rolesResult.data);

        if (isBusinessUser) {
          console.log('[Auth Callback] → Existing business user, redirecting to business dashboard');
          toast({
            title: "Welcome back!",
            description: "Redirecting to your business dashboard...",
          });
          navigate('/business/dashboard');
          return;
        }

        if (hasRoles) {
          console.log('[Auth Callback] → Existing food lover, redirecting to home');
          toast({
            title: "Welcome back!",
            description: "You've been logged in successfully.",
          });
          navigate('/');
          return;
        }

        // New user - needs to select a role
        console.log('[Auth Callback] → New user detected, showing role selection');
        setNeedsRoleSelection(true);
        setLoading(false);

      } catch (error) {
        console.error('[Auth Callback] Unexpected error:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred during sign-in.",
          variant: "destructive",
        });
        navigate('/welcome');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  const handleRoleSelection = async (role: 'food_lover' | 'business_owner') => {
    if (!userId) return;
    
    setSelectingRole(true);
    
    try {
      if (role === 'food_lover') {
        // Assign requester and recommender roles using the self-assignment function
        const { error: roleError } = await supabase.rpc('self_assign_initial_roles');

        if (roleError) {
          console.error('Error assigning roles:', roleError);
          throw roleError;
        }

        toast({
          title: "Welcome to Cravlr!",
          description: "Your account has been set up. Let's get started!",
        });

        // Redirect to food lover onboarding
        navigate('/onboarding/requester');
      } else {
        // Business owner - redirect to business onboarding
        // They'll need to verify their business
        toast({
          title: "Business Account Created!",
          description: "Please complete business verification to access all features.",
        });

        navigate('/business/onboarding?from=google');
      }
    } catch (error) {
      console.error('Error setting up account:', error);
      toast({
        title: "Setup Error",
        description: "Unable to complete account setup. Please try again.",
        variant: "destructive",
      });
      setSelectingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Completing sign-in...</p>
        </div>
      </div>
    );
  }

  if (needsRoleSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Welcome, {userName}!
            </CardTitle>
            <p className="text-muted-foreground">
              How would you like to use Cravlr?
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-auto py-6 flex items-center gap-4 hover:border-primary hover:bg-primary/5"
              onClick={() => handleRoleSelection('food_lover')}
              disabled={selectingRole}
            >
              <div className="h-12 w-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Utensils className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">I'm a Food Lover</p>
                <p className="text-sm text-muted-foreground">
                  Discover restaurants & earn rewards
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-6 flex items-center gap-4 hover:border-primary hover:bg-primary/5"
              onClick={() => handleRoleSelection('business_owner')}
              disabled={selectingRole}
            >
              <div className="h-12 w-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">I'm a Business Owner</p>
                <p className="text-sm text-muted-foreground">
                  Grow my restaurant through referrals
                </p>
              </div>
            </Button>

            {selectingRole && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up your account...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default GoogleAuthCallback;
