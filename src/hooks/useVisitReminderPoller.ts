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
  const isPollingRef = useRef(false);

  useEffect(() => {
    // Clear any existing interval when user changes
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Don't poll if no user
    if (!user) {
      isPollingRef.current = false;
      return;
    }

    isPollingRef.current = true;

    const pollReminders = async () => {
      // Don't poll if user logged out or polling stopped
      if (!isPollingRef.current) return;

      try {
        console.log('🔔 Polling for visit reminders...');
        
        // Verify session is still valid before polling
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('🔔 No valid session, skipping reminder poll');
          isPollingRef.current = false;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return;
        }

        const { data, error } = await supabase.functions.invoke('process-visit-reminders');
        
        if (error) {
          // Stop polling on auth errors
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            console.log('🔔 Auth error, stopping reminder polling');
            isPollingRef.current = false;
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            return;
          }
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
      isPollingRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [user]);
};
