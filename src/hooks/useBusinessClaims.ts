import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmailVerification } from './useEmailVerification';
import { toast as sonnerToast } from 'sonner';

interface BusinessClaimData {
  restaurant_name: string;
  place_id?: string;
  business_email: string;
  business_phone?: string;
}

interface BusinessProfileData {
  business_name: string;
  contact_name: string;
  business_address?: string;
  business_website?: string;
}

export const useBusinessClaims = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isVerified } = useEmailVerification();
  const { toast } = useToast();

  const submitBusinessClaim = useCallback(async (
    claimData: BusinessClaimData, 
    profileData: BusinessProfileData
  ) => {
    // Check email verification first
    if (!isVerified) {
      sonnerToast.error('Please verify your email address before claiming a business');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First create the business profile
      const { error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          ...profileData
        });

      if (profileError) {
        console.error('❌ Error creating business profile:', profileError);
        throw profileError;
      }

      // Then create the business claim
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error: claimError } = await supabase
        .from('business_claims')
        .insert({
          user_id: user.id,
          restaurant_name: claimData.restaurant_name,
          place_id: claimData.place_id
        });

      if (claimError) {
        console.error('❌ Error creating business claim:', claimError);
        throw claimError;
      }

      // Note: Business status is now determined by having a row in business_profiles
      // No need to update persona - users can be both requesters and recommenders

      toast({
        title: "Claim Submitted Successfully! 🎉",
        description: "Your restaurant claim is pending review. We'll notify you once it's verified.",
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit business claim';
      setError(errorMessage);
      toast({
        title: "Error Submitting Claim",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, isVerified]);

  const getBusinessAnalytics = useCallback(async (userId?: string) => {
    return [];
  }, []);

  const fetchBusinessClaims = useCallback(async (userId?: string) => {
    try {
      let query = supabase
        .from('business_claims')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching business claims:', error);
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('❌ Error in fetchBusinessClaims:', err);
      setError(err.message);
      return [];
    }
  }, []);

  const updateClaimStatus = useCallback(async (
    claimId: string, 
    status: 'verified' | 'rejected',
    notes?: string
  ) => {
    setLoading(true);
    try {
      const updateData: any = {
        status,
        verification_notes: notes,
        verified_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (status === 'verified') {
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('business_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: `Claim ${status === 'verified' ? 'Approved' : 'Rejected'}`,
        description: `The business claim has been ${status}.`,
      });

      return true;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    submitBusinessClaim,
    getBusinessAnalytics,
    fetchBusinessClaims,
    updateClaimStatus,
    loading,
    error
  };
};