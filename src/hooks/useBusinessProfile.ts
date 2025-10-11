import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  is_premium: boolean;
  premium_started_at: string | null;
  commission_rate: number;
  subscription_tier: string;
}

export const useBusinessProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setIsPremium(data?.is_premium === true);
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = () => {
    fetchProfile();
  };

  return {
    profile,
    isPremium,
    loading,
    refreshProfile
  };
};
