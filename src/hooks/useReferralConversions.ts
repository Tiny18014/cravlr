import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
          *,
          recommendations!inner(recommender_id),
          profiles!referral_clicks_recommender_id_fkey(display_name),
          profiles!referral_clicks_requester_id_fkey(display_name)
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

      // Transform data to include display names
      const transformedData = (data || []).map((click: any) => ({
        ...click,
        recommender_name: click.profiles?.display_name || 'Unknown',
        requester_name: click.profiles?.display_name || 'Unknown'
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
    notes?: string
  ) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('mark_conversion', {
        p_referral_click_id: clickId,
        p_conversion_method: conversionMethod,
        p_conversion_value: conversionValue,
        p_commission_rate: 0.10, // Default 10% commission
        p_notes: notes
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Conversion Marked! 🎉",
        description: `Order value of $${conversionValue} has been recorded. Commission and points have been awarded.`,
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
  }, [toast]);

  return {
    fetchPendingReferralClicks,
    markConversion,
    loading
  };
};