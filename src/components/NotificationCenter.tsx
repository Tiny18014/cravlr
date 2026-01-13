import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, UnifiedNotification } from '@/hooks/useNotifications';

export function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  console.log('[NotificationCenter] Rendering notifications count:', notifications.length);

  // Mark all as read when sheet opens
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      console.log('[NotificationCenter] Sheet opened, marking all as read');
      markAllAsRead();
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  const handleNotificationClick = (n: UnifiedNotification) => {
    console.log('[NotificationCenter] Notification clicked:', { id: n.id, type: n.type, source: n.source });
    
    markAsRead(n.id, n.source);
    
    // Navigate based on notification type and source
    if (n.source === 'recommender') {
      // For recommender notifications (new_request_nearby, accepted, declined, etc.)
      if (n.type === 'new_request_nearby' && n.request_id) {
        console.log('[NotificationCenter] Navigating to send-recommendation for request:', n.request_id);
        navigate(`/send-recommendation?requestId=${n.request_id}`);
      } else if (n.recommendation_id) {
        console.log('[NotificationCenter] Navigating to browse-requests');
        navigate('/browse-requests');
      } else {
        navigate('/browse-requests');
      }
    } else {
      // For system notifications (to requester)
      if (n.request_id) {
        console.log('[NotificationCenter] Navigating to request results:', n.request_id);
        navigate(`/request-results/${n.request_id}`);
      }
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'new_request_nearby':
        return '🍽️';
      case 'accepted':
        return '🎉';
      case 'declined':
        return '😢';
      case 'visit_reminder':
        return '⏰';
      case 'new_recommendation':
        return '💡';
      default:
        return '🔔';
    }
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
                const isUnread = !n.read;

                return (
                  <div
                    key={`${n.source}-${n.id}`}
                    className={`p-4 rounded-xl border transition-colors cursor-pointer active:scale-98 ${
                      isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-lg">{getNotificationIcon(n.type)}</span>
                        <div className="flex-1">
                          <h4 className={`text-sm ${isUnread ? 'font-semibold text-primary' : 'font-medium'}`}>
                            {n.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                            {n.source === 'recommender' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                                Recommender
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isUnread && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
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
