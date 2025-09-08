import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationStep {
  step: 'phone_verification' | 'email_verification' | 'document_upload' | 'manual_review';
  completed: boolean;
  required: boolean;
}

interface BusinessVerificationData {
  claimId: string;
  phone: string;
  email: string;
  restaurantName: string;
  steps: VerificationStep[];
}

export const useBusinessVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<BusinessVerificationData | null>(null);
  const { toast } = useToast();

  const sendPhoneVerification = useCallback(async (claimId: string, phoneNumber: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📱 Sending phone verification for:', phoneNumber);

      const { data, error } = await supabase.rpc('send_phone_verification', {
        claim_id: claimId,
        phone_number: phoneNumber
      });

      if (error) {
        console.error('❌ Error sending phone verification:', error);
        setError(error.message);
        toast({
          title: "Verification Failed",
          description: "Failed to send phone verification code.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Phone verification sent successfully');
      toast({
        title: "Verification Code Sent",
        description: "Check your phone for the 6-digit verification code.",
      });
      return true;

    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Failed to send verification code');
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const verifyPhoneCode = useCallback(async (claimId: string, code: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Verifying phone code for claim:', claimId);

      const { data, error } = await supabase.rpc('verify_phone_code', {
        claim_id: claimId,
        provided_code: code
      });

      if (error) {
        console.error('❌ Error verifying phone code:', error);
        setError(error.message);
        toast({
          title: "Verification Failed",
          description: "Invalid or expired verification code.",
          variant: "destructive",
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Verification Failed",
          description: "Invalid or expired verification code.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Phone verification successful');
      toast({
        title: "Phone Verified!",
        description: "Your phone number has been successfully verified.",
      });
      return true;

    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Failed to verify code');
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const verifyBusinessEmailDomain = useCallback(async (email: string, restaurantName: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📧 Verifying business email domain:', email);

      const { data, error } = await supabase.rpc('verify_business_email_domain', {
        email,
        restaurant_name: restaurantName
      });

      if (error) {
        console.error('❌ Error verifying email domain:', error);
        setError(error.message);
        return false;
      }

      console.log('✅ Email domain verification result:', data);
      return data;

    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Failed to verify email domain');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVerificationStatus = useCallback(async (claimId: string) => {
    try {
      const { data, error } = await supabase
        .from('business_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (error) {
        console.error('❌ Error getting verification status:', error);
        return null;
      }

      return {
        phoneVerified: data.phone_verified,
        emailVerified: data.email_verified,
        verificationStep: data.verification_step,
        status: data.status
      };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return null;
    }
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
    verificationData
  };
};