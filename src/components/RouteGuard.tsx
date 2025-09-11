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
  const [userProfile, setUserProfile] = useState<{ persona?: string; is_admin?: boolean } | null>(null);
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
            .select('persona, is_admin')
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
        const isBusinessUser = businessClaims && businessClaims.length > 0;
        setHasBusinessProfile(isBusinessUser);

        // Enhanced access control logic
        if (businessOnly && !isBusinessUser) {
          console.log('🚫 Non-business user trying to access business route, redirecting to home');
          navigate('/');
          return;
        }

        if (regularUserOnly && isBusinessUser) {
          console.log('🚫 Business user trying to access regular user route, redirecting to business dashboard');
          navigate('/business/dashboard');
          return;
        }

        // Special handling for root path - redirect based on user type
        if (location.pathname === '/' && isBusinessUser) {
          console.log('🏢 Business user accessing root, redirecting to business dashboard');
          navigate('/business/dashboard');
          return;
        }

        // For admin routes, check admin permissions separately
        if (location.pathname.startsWith('/admin/')) {
          const isAdmin = profile?.is_admin === true;
          if (!isAdmin) {
            console.log('🚫 Non-admin user trying to access admin route');
            navigate(isBusinessUser ? '/business/dashboard' : '/');
            return;
          }
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