import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/UnifiedNotificationContext';
import { RequestService } from '@/services/RequestService';
import { useAuth } from '@/contexts/AuthContext';

export const UnifiedNotificationDisplay: React.FC = () => {
  const { currentNotification, dismissNotification } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAction = async () => {
    if (!currentNotification) return;

    const { data, actionUrl } = currentNotification;

    // Dismiss notification first to prevent it from reappearing
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

  const handleIgnore = async () => {
    if (!currentNotification) return;

    const { data } = currentNotification;

    // Dismiss notification first to prevent it from reappearing
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

  if (!currentNotification) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        zIndex: 100000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div className="rounded-2xl shadow-xl border bg-white p-3 animate-[slide-up_180ms_ease] text-black max-w-sm">
        <div className="text-sm text-gray-600 mb-1">
          {currentNotification.type === "new_request" ? "New request nearby" : "Your request has ended"}
        </div>
        <div className="font-semibold text-base mb-2">
          {currentNotification.title}
        </div>
        <div className="text-sm text-gray-700 mb-3">
          {currentNotification.message}
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2 px-3 rounded-xl bg-black text-white text-sm font-medium"
            onClick={handleAction}
          >
            {currentNotification.actionLabel}
          </button>
          <button
            className="flex-1 py-2 px-3 rounded-xl border text-sm"
            onClick={handleIgnore}
          >
            {currentNotification.type === "new_request" ? "Ignore" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
};