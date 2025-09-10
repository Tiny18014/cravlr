/**
 * Simple provider that just renders the notification popup
 * This replaces the complex NotificationsProvider
 */
import React from 'react';
import { IsolatedRequestPopup } from './IsolatedRequestPopup';

interface RequestNotificationProviderProps {
  children: React.ReactNode;
}

export const RequestNotificationProvider: React.FC<RequestNotificationProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <IsolatedRequestPopup />
    </>
  );
};