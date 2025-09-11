import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface RouteGuardProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  businessOnly?: boolean;
  regularUserOnly?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requiresAuth = true,
  businessOnly = false,
  regularUserOnly = false
}) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<{ persona?: string } | null>(null);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (authLoading) return;

      // If route requires auth but user is not logged in
      if (requiresAuth && !user) {
        navigate('/welcome');
        return;
      }

      // If user is not logged in and route doesn't require auth, allow access
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 RouteGuard: Checking user access for:', {
          userId: user.id,
          email: user.email,
          currentPath: location.pathname,
          businessOnly,
          regularUserOnly
        });

        // Fetch user profile and business claims (not just business_profiles)
        const [profileResult, businessResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('persona')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('business_claims')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('status', 'verified')
            .limit(1)
        ]);

        const profile = profileResult.data;
        const businessClaims = businessResult.data;
        
        console.log('🔍 RouteGuard: Profile data:', {
          profile,
          businessClaims,
          hasBusinessClaim: businessClaims && businessClaims.length > 0
        });
        
        setUserProfile(profile);
        setHasBusinessProfile(businessClaims && businessClaims.length > 0);

        // Business-only routes
        if (businessOnly && (!businessClaims || businessClaims.length === 0)) {
          console.log('🚫 Non-business user trying to access business route');
          navigate('/');
          return;
        }

        // Regular user-only routes (business users should not access these)
        if (regularUserOnly && businessClaims && businessClaims.length > 0) {
          console.log('🚫 Business user trying to access regular user route, redirecting to business dashboard');
          navigate('/business/dashboard');
          return;
        }

        console.log('✅ RouteGuard: Access granted for path:', location.pathname);

      } catch (error) {
        console.error('❌ RouteGuard: Error checking user access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [user, authLoading, navigate, location.pathname, requiresAuth, businessOnly, regularUserOnly]);

  // Show loading while checking access
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If not authenticated and auth is required, don't render children
  if (requiresAuth && !user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return <>{children}</>;
};