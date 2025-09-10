/**
 * Hook for managing notification popup queue
 * Isolated from the notification service for better separation of concerns
 */
import { useState, useRef, useCallback } from 'react';
import type { NotificationPing } from '@/services/RequestNotificationService';

export interface QueuedNotification extends NotificationPing {
  timestamp: number;
}

export const useNotificationQueue = () => {
  const [activeNotification, setActiveNotification] = useState<QueuedNotification | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queueRef = useRef<QueuedNotification[]>([]);

  const addToQueue = useCallback((ping: NotificationPing) => {
    console.log("🎯 Adding notification to queue:", ping);
    
    // Handle clear all signal
    if (ping.id === 'CLEAR_ALL') {
      console.log("🎯 Clearing all notifications");
      queueRef.current = [];
      setActiveNotification(null);
      return;
    }

    // Check for duplicates
    const isDuplicate = queueRef.current.some(item => 
      item.id === ping.id && item.type === ping.type
    );
    
    if (isDuplicate) {
      console.log("🎯 Duplicate notification, skipping:", ping.id);
      return;
    }

    const queuedNotification: QueuedNotification = {
      ...ping,
      timestamp: Date.now()
    };

    queueRef.current.push(queuedNotification);
    
    // Show immediately if no active notification
    if (!activeNotification) {
      processQueue();
    }
  }, [activeNotification]);

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      console.log("🎯 Queue is empty");
      return;
    }

    const nextNotification = queueRef.current.shift()!;
    console.log("🎯 Processing next notification:", nextNotification);
    setActiveNotification(nextNotification);
  }, []);

  const closeNotification = useCallback(() => {
    console.log("🎯 Closing current notification");
    setActiveNotification(null);
    setIsProcessing(false);
    
    // Process next in queue after a brief delay
    setTimeout(() => {
      processQueue();
    }, 100);
  }, [processQueue]);

  const clearQueue = useCallback(() => {
    console.log("🎯 Clearing entire notification queue");
    queueRef.current = [];
    setActiveNotification(null);
    setIsProcessing(false);
  }, []);

  return {
    activeNotification,
    isProcessing,
    setIsProcessing,
    addToQueue,
    closeNotification,
    clearQueue,
    queueLength: queueRef.current.length
  };
};