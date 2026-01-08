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
      // Fetch recommender notifications for requests tab (new_request_nearby)
      const { data: recommenderData, error: recommenderError } = await supabase
        .from('recommender_notifications')
        .select('type')
        .eq('recommender_id', user.id)
        .eq('read', false);

      if (recommenderError) {
        console.error('Error fetching recommender notifications:', recommenderError);
      }

      // Fetch requester notifications for dashboard tab
      const { data: requesterData, error: requesterError } = await supabase
        .from('notifications')
        .select('type')
        .eq('requester_id', user.id)
        .eq('read', false);

      if (requesterError) {
        console.error('Error fetching requester notifications:', requesterError);
      }

      // Requests tab: new_request_nearby from recommender_notifications
      const requests = recommenderData?.filter(n => n.type === 'new_request_nearby').length || 0;

      // Dashboard tab: outcomes from notifications table
      const dashboardTypes = ['request_results', 'request_accepted', 'request_declined', 'new_recommendation', 'visit_reminder'];
      const dashboard = requesterData?.filter(n => dashboardTypes.includes(n.type)).length || 0;

      setCounts({ requests, dashboard });
    };

    fetchCounts();

    // Subscribe to both tables for real-time updates
    const recommenderChannel = supabase
      .channel('unread-counts-recommender')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommender_notifications',
          filter: `recommender_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    const requesterChannel = supabase
      .channel('unread-counts-requester')
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
      supabase.removeChannel(recommenderChannel);
      supabase.removeChannel(requesterChannel);
    };
  }, [user]);

  return counts;
}
