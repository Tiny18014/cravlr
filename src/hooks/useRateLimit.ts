import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRateLimit = () => {
  const [checking, setChecking] = useState(false);

  const checkRateLimit = useCallback(async (
    actionType: string,
    maxAttempts: number = 5,
    windowMinutes: number = 60
  ): Promise<boolean> => {
    try {
      setChecking(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      
      // Check rate limit using database function
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_ip_address: null, // IP tracking would require server-side implementation
        p_action_type: actionType,
        p_max_attempts: maxAttempts,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // On error, allow the action but log it
        return true;
      }

      const isAllowed = data as boolean;

      // Log the attempt if allowed
      if (isAllowed) {
        await supabase.rpc('log_rate_limit_attempt', {
          p_user_id: userId,
          p_ip_address: null,
          p_action_type: actionType
        });
      }

      return isAllowed;
    } catch (error) {
      console.error('Rate limit error:', error);
      // On error, allow the action
      return true;
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checkRateLimit,
    checking
  };
};
