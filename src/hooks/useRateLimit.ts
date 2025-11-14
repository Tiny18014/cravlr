import { useState, useCallback } from 'react';

interface RateLimitAttempt {
  timestamp: number;
  actionType: string;
}

/**
 * Client-side rate limiting for UX purposes only.
 * WARNING: This can be easily bypassed and should NOT be relied upon for security.
 * Real rate limiting must be implemented server-side in edge functions.
 */
export const useRateLimit = () => {
  const [checking, setChecking] = useState(false);

  const checkRateLimit = useCallback(async (
    actionType: string,
    maxAttempts: number = 5,
    windowMinutes: number = 60
  ): Promise<boolean> => {
    try {
      setChecking(true);
      
      // Get attempts from localStorage
      const storageKey = 'rate_limit_attempts';
      const stored = localStorage.getItem(storageKey);
      const attempts: RateLimitAttempt[] = stored ? JSON.parse(stored) : [];
      
      const windowStart = Date.now() - windowMinutes * 60 * 1000;
      
      // Filter to only recent attempts of this action type
      const recentAttempts = attempts.filter(
        a => a.actionType === actionType && a.timestamp > windowStart
      );
      
      const isAllowed = recentAttempts.length < maxAttempts;
      
      // If allowed, log the attempt
      if (isAllowed) {
        const newAttempts = [
          ...attempts.filter(a => a.timestamp > windowStart), // Keep only recent attempts
          { timestamp: Date.now(), actionType }
        ];
        localStorage.setItem(storageKey, JSON.stringify(newAttempts));
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
