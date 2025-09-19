import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRateLimit = () => {
  const [checking, setChecking] = useState(false);

  const checkRateLimit = useCallback(async (
    actionType: string,
    maxAttempts: number = 5,
    windowMinutes: number = 60
  ): Promise<boolean> => {
    setChecking(true);
    
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_action_type: actionType,
        p_max_attempts: maxAttempts,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check error:', error);
        toast.error('Unable to verify rate limit. Please try again.');
        return false;
      }

      if (!data) {
        toast.error(`Too many attempts. Please wait ${windowMinutes} minutes before trying again.`);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected rate limit error:', err);
      toast.error('Rate limit check failed. Please try again.');
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checkRateLimit,
    checking
  };
};