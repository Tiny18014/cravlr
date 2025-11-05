import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmailVerification } from './useEmailVerification';
import { toast as sonnerToast } from 'sonner';

interface PendingReferralClick {
  id: string;
  restaurant_name: string;
  place_id?: string;
  recommender_name?: string;
  requester_name?: string;
  clicked_at: string;
  commission_rate: number;
  recommendation_id: string;
  request_id: string;
  recommender_id: string;
  requester_id: string;
}

export const useReferralConversions = () => {
  const [loading, setLoading] = useState(false);
  const { isVerified } = useEmailVerification();
  const { toast } = useToast();

  const fetchPendingReferralClicks = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      
      // Get business claims for the user to filter relevant clicks
      const { data: claims } = await supabase
        .from('business_claims')
        .select('place_id, restaurant_name')
        .eq('user_id', userId)
        .eq('status', 'verified');

      if (!claims || claims.length === 0) {
        return [];
      }

      // Build query to get pending referral clicks for user's restaurants
      let query = supabase
        .from('referral_clicks')
        .select(`
          *
        `)
        .eq('converted', false);

      // Filter by restaurant name or place_id
      const restaurantFilters = claims.map(claim => {
        if (claim.place_id) {
          return `place_id.eq.${claim.place_id}`;
        } else {
          return `restaurant_name.ilike.%${claim.restaurant_name}%`;
        }
      }).join(',');

      const { data, error } = await query.or(restaurantFilters);

      if (error) {
        console.error('Error fetching pending referral clicks:', error);
        throw error;
      }

      // Get display names separately to avoid foreign key issues
      const transformedData = await Promise.all((data || []).map(async (click: any) => {
        const [recommenderProfile, requesterProfile] = await Promise.all([
          supabase
             .from('profiles')
             .select('display_name')
             .eq('user_id', click.recommender_id)
             .maybeSingle(),
           supabase
             .from('profiles')
             .select('display_name')
             .eq('user_id', click.requester_id)
             .maybeSingle()
         ]);

        return {
          ...click,
          recommender_name: recommenderProfile.data?.display_name || 'Unknown',
          requester_name: requesterProfile.data?.display_name || 'Unknown'
        };
      }));

      return transformedData;
    } catch (err: any) {
      console.error('Error in fetchPendingReferralClicks:', err);
      toast({
        title: "Error",
        description: "Failed to fetch pending referral clicks",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const markConversion = useCallback(async (
    clickId: string,
    conversionValue: number,
    conversionMethod: string = 'business_verified',
    visitDate?: Date,
    notes?: string
  ) => {
    if (!isVerified) {
      sonnerToast.error('Please verify your email address to mark conversions');
      return false;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('referral_clicks')
        .update({
          converted: true,
          conversion_value: conversionValue,
          visit_confirmed_at: new Date().toISOString()
        })
        .eq('id', clickId);

      if (error) throw error;

      toast({
        title: "Visit Confirmed! 🎉",
        description: `Order value of $${conversionValue} has been recorded.`,
      });

      return true;
    } catch (err: any) {
      console.error('Error marking conversion:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to mark conversion",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, isVerified]);

  return {
    fetchPendingReferralClicks,
    markConversion,
    loading
  };
};