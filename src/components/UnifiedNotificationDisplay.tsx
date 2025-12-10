import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '@/contexts/UnifiedNotificationContext';
import { RequestService } from '@/services/RequestService';
import { useAuth } from '@/contexts/AuthContext';
import { X, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Goal 6: Subtle, non-blocking notification component
export const UnifiedNotificationDisplay: React.FC = () => {
  const { currentNotification, dismissNotification } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-dismiss if user is already on the target page
  React.useEffect(() => {
    if (currentNotification?.type === 'request_results' && 
        currentNotification.data?.requestId && 
        location.pathname.includes(`/requests/${currentNotification.data.requestId}/results`)) {
      dismissNotification();
    }
  }, [currentNotification, location.pathname, dismissNotification]);

  const handleAction = async () => {
    if (!currentNotification) return;

    const { data, actionUrl } = currentNotification;
    dismissNotification();

    try {
      if (data.requestType === 'accept') {
        await RequestService.acceptRequest(data.requestId);
        navigate(actionUrl);
      } else if (data.requestType === 'view_results') {
        if (user?.id) {
          await RequestService.markNotificationRead(data.requestId, user.id);
        }
        navigate(actionUrl);
      } else {
        navigate(actionUrl);
      }
    } catch (error) {
      console.error("Error handling notification action:", error);
    }
  };

  const handleDismiss = async () => {
    if (!currentNotification) return;

    const { data } = currentNotification;
    dismissNotification();

    try {
      if (data.requestType === 'accept') {
        await RequestService.ignoreRequest(data.requestId);
      } else if (data.requestType === 'view_results' && user?.id) {
        await RequestService.markNotificationRead(data.requestId, user.id);
      }
    } catch (error) {
      console.error("Error handling notification dismiss:", error);
    }
  };

  // Don't render if no notification or already on target page
  if (!currentNotification) return null;
  
  if (currentNotification.type === 'request_results' && 
      currentNotification.data?.requestId && 
      location.pathname.includes(`/requests/${currentNotification.data.requestId}/results`)) {
    return null;
  }

  const isHighPriority = currentNotification.priority === 'high';
  const isNewRequest = currentNotification.type === 'new_request';

  return (
    <>
      {/* Subtle top banner notification - Goal 6: Non-blocking design */}
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-[99999]",
          "animate-in slide-in-from-top duration-300"
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div 
          className={cn(
            "mx-2 mt-2 rounded-xl shadow-lg border backdrop-blur-sm",
            isHighPriority 
              ? "bg-primary/95 border-primary text-primary-foreground" 
              : "bg-background/95 border-border text-foreground"
          )}
        >
          <div className="flex items-center gap-3 p-3">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
              isHighPriority ? "bg-primary-foreground/20" : "bg-primary/10"
            )}>
              <Bell className={cn(
                "h-5 w-5",
                isHighPriority ? "text-primary-foreground" : "text-primary"
              )} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isHighPriority ? "text-primary-foreground" : "text-foreground"
              )}>
                {currentNotification.title}
              </p>
              <p className={cn(
                "text-xs truncate mt-0.5",
                isHighPriority ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {currentNotification.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleAction}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isHighPriority 
                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {currentNotification.actionLabel}
              </button>
              
              <button
                onClick={handleDismiss}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isHighPriority 
                    ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Swipe hint for mobile */}
          <div 
            className={cn(
              "h-1 w-12 mx-auto mb-1 rounded-full opacity-30",
              isHighPriority ? "bg-primary-foreground" : "bg-foreground"
            )}
          />
        </div>
      </div>
    </>
  );
};