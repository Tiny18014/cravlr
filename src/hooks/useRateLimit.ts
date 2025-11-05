import { useState, useCallback } from 'react';

export const useRateLimit = () => {
  const [checking, setChecking] = useState(false);

  const checkRateLimit = useCallback(async (
    actionType: string,
    maxAttempts: number = 5,
    windowMinutes: number = 60
  ): Promise<boolean> => {
    // Rate limiting disabled
    return true;
  }, []);

  return {
    checkRateLimit,
    checking
  };
};
