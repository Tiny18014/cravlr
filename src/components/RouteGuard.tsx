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
        // Fetch user profile and business profile
        const [profileResult, businessResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('persona')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('business_profiles')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
        ]);

        const profile = profileResult.data;
        const businessProfiles = businessResult.data;
        
        setUserProfile(profile);
        setHasBusinessProfile(businessProfiles && businessProfiles.length > 0);

        // Business-only routes
        if (businessOnly && !businessProfiles?.length) {
          console.log('🚫 Non-business user trying to access business route');
          navigate('/');
          return;
        }

        // Regular user-only routes (business users should not access these)
        if (regularUserOnly && businessProfiles?.length > 0) {
          console.log('🚫 Business user trying to access regular user route');
          navigate('/business/dashboard');
          return;
        }

      } catch (error) {
        console.error('Error checking user access:', error);
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