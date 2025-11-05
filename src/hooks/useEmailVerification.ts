import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useEmailVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const checkEmailVerification = useCallback(async () => {
    setIsVerified(true);
    setLoading(false);
    return true;
  }, [user]);

  const resendVerification = useCallback(async () => {
    // Stub - feature unavailable
  }, [user?.email]);

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
