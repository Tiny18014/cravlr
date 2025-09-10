/**
 * MIGRATION STUB: This file has been replaced by the new isolated notification system
 * This stub prevents cache-related errors during the transition
 */
import React, { createContext, useContext } from 'react';

// Minimal stub to prevent "must be used within provider" errors
const NotificationsContext = createContext<any>(null);

export const useNotifications = () => {
  // Redirect to new system
  console.warn('🔄 useNotifications is deprecated. Use useRequestNotifications instead.');
  console.warn('📁 Import from: @/hooks/useRequestNotifications');
  
  // Return safe defaults to prevent crashes
  return {
    dnd: false,
    setDnd: () => {},
    nextPing: null,
    acceptRequest: () => {},
    ignoreRequest: () => {},
    clearPing: () => {}
  };
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.warn('🔄 NotificationsProvider is deprecated. Use RequestNotificationProvider instead.');
  console.warn('📁 Import from: @/components/RequestNotificationProvider');
  
  return (
    <NotificationsContext.Provider value={{}}>
      {children}
    </NotificationsContext.Provider>
  );
};