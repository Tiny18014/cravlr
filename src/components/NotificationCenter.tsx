import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    // Fetch all columns to avoid "column does not exist" error
    // We filter in JS as a robust workaround for schema drift
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    if (data) {
      setNotifications(data);
      // Determine unread count - use the 'read' boolean field
      const unread = data.filter(n => n.read !== true);
      setUnreadCount(unread.length);
    }
  };

  // Mark all as read when notification center opens
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // When sheet opens, mark all as read
  useEffect(() => {
    if (isOpen) {
      markAllAsRead();
    }
  }, [isOpen]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    if (!user) return;
    const channel = supabase
      .channel('notification-center')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `requester_id=eq.${user.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    // Try update 'read' column first (most likely)
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
       console.error('Error marking notification as read:', error);
    }

    // Optimistic update
    setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    // Navigate based on type - use request_id directly from notification
    if (n.type === 'visit_reminder' && n.request_id) {
        navigate(`/requests/${n.request_id}/results`);
    } else if (n.type === 'new_recommendation' && n.request_id) {
        navigate(`/requests/${n.request_id}/results`);
    } else if (n.request_id) {
        navigate(`/requests/${n.request_id}/results`);
    }
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all opacity-60 hover:opacity-100">
          <div className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">Inbox</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">{unreadCount} unread</span>
            )}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full pb-10">
          <div className="flex flex-col gap-3">
            {notifications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No notifications yet</p>
                </div>
            ) : (
                notifications.map((n) => {
                    const isUnread = n.read !== true;

                    return (
                        <div
                            key={n.id}
                            className={`p-4 rounded-xl border transition-colors cursor-pointer active:scale-98 ${
                                isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                            }`}
                            onClick={() => handleNotificationClick(n)}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <h4 className={`text-sm ${isUnread ? 'font-semibold text-primary' : 'font-medium'}`}>
                                        {n.title || 'Notification'}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {n.message || 'You have a new update.'}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                {isUnread && (
                                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                                )}
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
