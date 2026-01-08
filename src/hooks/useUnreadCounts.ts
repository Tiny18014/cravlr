import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCounts {
  requests: number;
  dashboard: number;
}

export function useUnreadCounts(): UnreadCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ requests: 0, dashboard: 0 });

  useEffect(() => {
    if (!user) {
      setCounts({ requests: 0, dashboard: 0 });
      return;
    }

    const fetchCounts = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('type')
        .eq('requester_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread counts:', error);
        return;
      }

      const requestTypes = ['new_request'];
      const dashboardTypes = ['request_results', 'request_accepted', 'request_declined', 'new_recommendation'];

      const requests = data?.filter(n => requestTypes.includes(n.type)).length || 0;
      const dashboard = data?.filter(n => dashboardTypes.includes(n.type)).length || 0;

      setCounts({ requests, dashboard });
    };

    fetchCounts();

    const channel = supabase
      .channel('unread-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `requester_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return counts;
}
