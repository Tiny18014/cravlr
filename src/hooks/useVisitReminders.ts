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
      const { data, error } = await supabase
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

      // For each notification, get the recommendation details
      const remindersWithDetails = await Promise.all(
        (data || []).map(async (notif) => {
          const { data: recommendations, error: recError } = await supabase
            .from('recommendations')
            .select('id, restaurant_name, food_requests!inner(food_type)')
            .eq('request_id', notif.request_id)
            .limit(1);

          if (recError || !recommendations || recommendations.length === 0) {
            return null;
          }

          const rec = recommendations[0];
          return {
            id: notif.id,
            recommendation_id: rec.id,
            request_id: notif.request_id,
            restaurant_name: rec.restaurant_name,
            food_type: (rec.food_requests as any).food_type,
          };
        })
      );

      setReminders(remindersWithDetails.filter(Boolean) as VisitReminder[]);
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