import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useEmailVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Check email verification status
  const checkEmailVerification = useCallback(async () => {
    if (!user) {
      setIsVerified(false);
      setLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('is_email_verified');
      
      if (error) {
        console.error('Error checking email verification:', error);
        setIsVerified(false);
        setLoading(false);
        return false;
      }

      setIsVerified(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('Unexpected error checking email verification:', err);
      setIsVerified(false);
      setLoading(false);
      return false;
    }
  }, [user]);

  // Resend verification email
  const resendVerification = useCallback(async () => {
    if (!user?.email) {
      throw new Error('No user email found');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      throw error;
    }
  }, [user?.email]);

  // Check verification status on mount and when user changes
  useEffect(() => {
    checkEmailVerification();
  }, [checkEmailVerification]);

  return {
    isVerified,
    loading,
    checkEmailVerification,
    resendVerification
  };
};