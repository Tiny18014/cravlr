import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRequestExpiryTimer } from '@/hooks/useRequestExpiryTimer';

interface FoodRequest {
  id: string;
  food_type: string;
  expires_at: string;
  status: string;
  requester_id: string;
}

export function GlobalRequestExpiryTimer() {
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState<FoodRequest | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setActiveRequest(null);
      return;
    }

    const fetchActiveRequest = async () => {
      const { data, error } = await supabase
        .from('food_requests')
        .select('id, food_type, expires_at, status, requester_id')
        .eq('requester_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active request:', error);
        return;
      }

      setActiveRequest(data || null);
      console.log('🌍 GlobalRequestExpiryTimer: Active request found:', data?.id || 'none');
    };

    fetchActiveRequest();

    // Set up realtime subscription to detect when user creates/updates requests
    const channel = supabase
      .channel('global-request-expiry')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests',
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🌍 GlobalRequestExpiryTimer: Request change detected:', payload);
          fetchActiveRequest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Use the timer hook for the active request
  useRequestExpiryTimer(activeRequest, user?.id);

  return null;
}