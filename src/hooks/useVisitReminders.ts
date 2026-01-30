import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VisitReminder {
  id: string;
  recommendation_id: string;
  request_id: string;
  restaurant_name: string;
  food_type: string;
}

export const useVisitReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<VisitReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    try {
      // Get unread visit reminder notifications
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
          id,
          request_id,
          title,
          message,
          created_at
        `)
        .eq('requester_id', user.id)
        .eq('type', 'visit_reminder')
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        setReminders([]);
        setLoading(false);
        return;
      }

      // Batch fetch all recommendations for all request IDs at once (eliminates N+1)
      const requestIds = [...new Set(notifications.map(n => n.request_id))];
      
      const { data: recommendations, error: recError } = await supabase
        .from('recommendations')
        .select('id, request_id, restaurant_name, food_requests!inner(food_type)')
        .in('request_id', requestIds);

      if (recError) {
        console.error('Error fetching recommendations:', recError);
        setReminders([]);
        setLoading(false);
        return;
      }

      // Create a Map for O(1) lookups by request_id
      const recByRequestId = new Map<string, typeof recommendations[0]>();
      for (const rec of recommendations || []) {
        // Store first recommendation per request (in case of multiples)
        if (!recByRequestId.has(rec.request_id)) {
          recByRequestId.set(rec.request_id, rec);
        }
      }

      // Map notifications to reminders using the pre-fetched data
      const remindersWithDetails = notifications
        .map((notif) => {
          const rec = recByRequestId.get(notif.request_id);
          if (!rec) return null;

          return {
            id: notif.id,
            recommendation_id: rec.id,
            request_id: notif.request_id,
            restaurant_name: rec.restaurant_name,
            food_type: (rec.food_requests as { food_type: string }).food_type,
          };
        })
        .filter((r): r is VisitReminder => r !== null);

      setReminders(remindersWithDetails);
    } catch (error) {
      console.error('Error fetching visit reminders:', error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();

    // Subscribe to new notifications
    const channel = supabase
      .channel('visit-reminders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `requester_id=eq.${user?.id}`,
        },
        () => {
          fetchReminders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismissReminder = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    fetchReminders();
  };

  return {
    reminders,
    loading,
    dismissReminder,
    refetch: fetchReminders,
  };
};