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
        // Get fresh session to ensure we have a valid access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          console.log('🔔 No valid session, skipping reminder poll');
          isPollingRef.current = false;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return;
        }

        // Explicitly pass the access token in headers to ensure auth works
        const { data, error } = await supabase.functions.invoke('process-visit-reminders', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        if (error) {
          // Silently stop polling on auth errors (expected when session expires)
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            console.log('🔔 Session expired, stopping reminder polling');
            isPollingRef.current = false;
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            return;
          }
          // Only log non-auth errors at debug level
          console.debug('Reminder poll error:', error.message);
          return;
        }
        
        if (data?.processed > 0) {
          console.log(`✅ Processed ${data.processed} visit reminders`);
        }
      } catch (err) {
        // Silently handle errors - polling is background task
        console.debug('Reminder poll failed:', err);
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
