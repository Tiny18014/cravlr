/**
 * Simple provider that just renders the notification popup
 * This replaces the complex NotificationsProvider
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IsolatedRequestPopup } from './IsolatedRequestPopup';

interface RequestNotificationProviderProps {
  children: React.ReactNode;
}

export const RequestNotificationProvider: React.FC<RequestNotificationProviderProps> = ({ children }) => {
  const [routerReady, setRouterReady] = useState(false);
  
  // Ensure router context is available
  try {
    useLocation();
    if (!routerReady) {
      setRouterReady(true);
    }
  } catch (error) {
    console.warn('Router context not available for notifications');
  }

  useEffect(() => {
    // Small delay to ensure router is fully initialized
    const timer = setTimeout(() => {
      setRouterReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      {routerReady && <IsolatedRequestPopup />}
    </>
  );
};