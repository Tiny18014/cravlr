import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useBusinessVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const sendPhoneVerification = useCallback(async (claimId: string, phoneNumber: string) => {
    toast({
      title: "Feature Unavailable",
      description: "Phone verification is temporarily unavailable.",
      variant: "destructive",
    });
    return false;
  }, [toast]);

  const verifyPhoneCode = useCallback(async (claimId: string, code: string) => {
    toast({
      title: "Feature Unavailable",
      description: "Phone verification is temporarily unavailable.",
      variant: "destructive",
    });
    return false;
  }, [toast]);

  const verifyBusinessEmailDomain = useCallback(async (email: string, restaurantName: string) => {
    return false;
  }, []);

  const getVerificationStatus = useCallback(async (claimId: string) => {
    return null;
  }, []);

  const getBusinessEmailSuggestion = useCallback((restaurantName: string): string => {
    const slug = restaurantName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return `contact@${slug}.com`;
  }, []);

  const validateBusinessEmail = useCallback((email: string): { isValid: boolean; suggestion?: string; reason?: string } => {
    const domain = email.split('@')[1];
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    
    if (genericDomains.includes(domain)) {
      return {
        isValid: false,
        reason: 'Please use a business email address for faster verification.'
      };
    }

    return { isValid: true };
  }, []);

  return {
    sendPhoneVerification,
    verifyPhoneCode,
    verifyBusinessEmailDomain,
    getVerificationStatus,
    getBusinessEmailSuggestion,
    validateBusinessEmail,
    loading,
    error,
    verificationData: null
  };
};
