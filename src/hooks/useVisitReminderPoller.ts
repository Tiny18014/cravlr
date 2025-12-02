import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * This hook polls the process-visit-reminders edge function every 30 seconds
 * to check for and send due visit reminder notifications.
 */
export const useVisitReminderPoller = () => {
  const { user } = useAuth();
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const pollReminders = async () => {
      try {
        console.log('🔔 Polling for visit reminders...');
        const { data, error } = await supabase.functions.invoke('process-visit-reminders');
        
        if (error) {
          console.error('Error polling visit reminders:', error);
          return;
        }
        
        if (data?.processed > 0) {
          console.log(`✅ Processed ${data.processed} visit reminders`);
        }
      } catch (err) {
        console.error('Failed to poll visit reminders:', err);
      }
    };

    // Poll immediately on mount
    pollReminders();

    // Then poll every 30 seconds
    pollIntervalRef.current = window.setInterval(pollReminders, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user]);
};
