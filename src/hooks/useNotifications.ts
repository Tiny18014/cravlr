import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  request_id?: string;
  recommendation_id?: string;
  restaurant_name?: string;
  source: 'system' | 'recommender';
}

interface UseNotificationsReturn {
  notifications: UnifiedNotification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string, source: 'system' | 'recommender') => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    console.log('[useNotifications] Fetching notifications...');
    
    if (!user) {
      console.log('[useNotifications] No user, skipping fetch');
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch system notifications (for requesters)
      const { data: systemData, error: systemError } = await supabase
        .from('notifications')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (systemError) {
        console.error('[useNotifications] Error fetching system notifications:', systemError);
        throw systemError;
      }

      console.log('[useNotifications] System notifications:', systemData?.length || 0);

      // Fetch recommender notifications
      const { data: recommenderData, error: recommenderError } = await supabase
        .from('recommender_notifications')
        .select('*')
        .eq('recommender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (recommenderError) {
        console.error('[useNotifications] Error fetching recommender notifications:', recommenderError);
        throw recommenderError;
      }

      console.log('[useNotifications] Recommender notifications:', recommenderData?.length || 0);

      // Transform system notifications
      const systemNotifications: UnifiedNotification[] = (systemData || []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title || 'Notification',
        message: n.message || '',
        read: n.read === true,
        created_at: n.created_at,
        request_id: n.request_id,
        source: 'system' as const,
      }));

      // Transform recommender notifications
      const recommenderNotifications: UnifiedNotification[] = (recommenderData || []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read === true,
        created_at: n.created_at,
        request_id: n.request_id || undefined,
        recommendation_id: n.recommendation_id || undefined,
        restaurant_name: n.restaurant_name,
        source: 'recommender' as const,
      }));

      // Merge and sort by created_at (newest first)
      const merged = [...systemNotifications, ...recommenderNotifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('[useNotifications] Total merged notifications:', merged.length);

      setNotifications(merged);
      setUnreadCount(merged.filter((n) => !n.read).length);
    } catch (err) {
      console.error('[useNotifications] Error fetching:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string, source: 'system' | 'recommender') => {
    console.log('[useNotifications] Marking as read:', { id, source });
    
    const table = source === 'system' ? 'notifications' : 'recommender_notifications';
    
    const { error } = await supabase
      .from(table)
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.error('[useNotifications] Error marking as read:', error);
      return;
    }

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    console.log('[useNotifications] Marking all as read');
    
    if (!user || notifications.length === 0) return;

    const unreadSystem = notifications.filter((n) => !n.read && n.source === 'system').map((n) => n.id);
    const unreadRecommender = notifications.filter((n) => !n.read && n.source === 'recommender').map((n) => n.id);

    try {
      if (unreadSystem.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadSystem);
      }

      if (unreadRecommender.length > 0) {
        await supabase
          .from('recommender_notifications')
          .update({ read: true })
          .in('id', unreadRecommender);
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] Error marking all as read:', err);
    }
  }, [user, notifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('[useNotifications] Setting up real-time subscriptions');

    const channel = supabase
      .channel('unified-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useNotifications] New system notification:', payload);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recommender_notifications',
          filter: `recommender_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useNotifications] New recommender notification:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      console.log('[useNotifications] Cleaning up subscriptions');
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
