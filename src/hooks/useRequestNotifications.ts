/**
 * Main hook for request notification functionality
 * This provides a clean interface for components to use
 */
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RequestNotificationService } from '@/services/RequestNotificationService';
import { useNotificationQueue } from './useNotificationQueue';

export const useRequestNotifications = () => {
  const { user } = useAuth();
  const [dndEnabled, setDndEnabled] = useState(false);
  const notificationService = RequestNotificationService.getInstance();
  const queue = useNotificationQueue();

  // Load DND setting from profile
  useEffect(() => {
    const loadDndSetting = async () => {
      if (!user?.id) {
        setDndEnabled(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('notify_recommender')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading DND setting:', error);
          return;
        }

        const isDnd = profile ? !profile.notify_recommender : false;
        console.log("🔔 Loaded DND setting:", { notify_recommender: profile?.notify_recommender, isDnd });
        setDndEnabled(isDnd);
      } catch (error) {
        console.error('Error loading DND setting:', error);
      }
    };

    loadDndSetting();
  }, [user?.id]);

  // Initialize notification service
  useEffect(() => {
    if (!user?.id) return;

    console.log("🔔 Initializing notification service");
    notificationService.initialize({
      dndEnabled,
      userId: user.id
    });

    notificationService.addListener(queue.addToQueue);

    return () => {
      notificationService.removeListener(queue.addToQueue);
    };
  }, [user?.id, dndEnabled, queue.addToQueue]);

  // Update service config when DND changes
  useEffect(() => {
    notificationService.updateConfig({ dndEnabled });
  }, [dndEnabled]);

  const updateDndSetting = useCallback(async (enabled: boolean) => {
    console.log("🔔 Updating DND setting:", enabled);
    setDndEnabled(enabled);
    
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ notify_recommender: !enabled })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating DND setting:', error);
      }
    }
  }, [user?.id]);

  const acceptRequest = useCallback(async (requestId: string) => {
    console.log("🔔 Accepting request:", requestId);
    queue.setIsProcessing(true);
    
    try {
      await notificationService.acceptRequest(requestId);
      queue.closeNotification();
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      queue.setIsProcessing(false);
    }
  }, [queue]);

  const ignoreRequest = useCallback(async (requestId: string) => {
    console.log("🔔 Ignoring request:", requestId);
    queue.setIsProcessing(true);
    
    try {
      await notificationService.ignoreRequest(requestId);
      queue.closeNotification();
    } catch (error) {
      console.error("❌ Error ignoring request:", error);
      queue.closeNotification(); // Close anyway
    }
  }, [queue]);

  const viewResults = useCallback(async (requestId: string) => {
    console.log("🔔 Viewing results for request:", requestId);
    
    try {
      await notificationService.markNotificationRead(requestId);
      queue.closeNotification();
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      queue.closeNotification(); // Close anyway
    }
  }, [queue]);

  return {
    // State
    dndEnabled,
    activeNotification: queue.activeNotification,
    isProcessing: queue.isProcessing,
    queueLength: queue.queueLength,
    
    // Actions
    updateDndSetting,
    acceptRequest,
    ignoreRequest,
    viewResults,
    clearQueue: queue.clearQueue,
    closeNotification: queue.closeNotification
  };
};