import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GenerateReferralLinkParams {
  recommendationId: string;
  requestId: string;
  restaurantName: string;
  placeId?: string;
  mapsUrl?: string;
}

interface ReferralLinkResult {
  referralCode: string;
  referralUrl: string;
}

export const useReferralLinks = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReferralLink = useCallback(async (
    params: GenerateReferralLinkParams
  ): Promise<ReferralLinkResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // console.log('🔗 Generating referral link for:', params.restaurantName);

      const { data, error } = await supabase.functions.invoke('generate-referral-link', {
        body: params
      });

      if (error) {
        console.error('❌ Error generating referral link:', error);
        setError(error.message);
        return null;
      }

      // console.log('✅ Generated referral link:', data.referralCode);
      return data;

    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Failed to generate referral link');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReferralUrl = useCallback((referralCode: string): string => {
    // Use the correct Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ioqogdxfmapcijmqjcpb.supabase.co';
    return `${supabaseUrl}/functions/v1/track-referral-click/${referralCode}`;
  }, []);

  return {
    generateReferralLink,
    getReferralUrl,
    loading,
    error
  };
};