import { useState, useEffect, useCallback } from 'react';

export type PopupType = 'request_results' | 'new_request' | 'recommendation';

export interface Popup {
  id: string;
  type: PopupType;
  title: string;
  message: string;
  cta?: {
    label: string;
    to: string;
  };
  data?: any;
}

// Global state for popup system
const listeners = new Set<(popup: Popup) => void>();
let popupQueue: Popup[] = [];

export const usePopupBus = () => {
  const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);

  const pushPopup = useCallback((popup: Omit<Popup, 'id'>) => {
    const fullPopup: Popup = {
      ...popup,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    console.log('🔔 Pushing popup to bus:', fullPopup);
    
    // Dedupe by type and data
    const isDuplicate = popupQueue.some(p => 
      p.type === fullPopup.type && 
      JSON.stringify(p.data) === JSON.stringify(fullPopup.data)
    );
    
    if (!isDuplicate) {
      popupQueue.push(fullPopup);
      listeners.forEach(listener => listener(fullPopup));
    }
  }, []);

  const subscribe = useCallback((callback: (popup: Popup) => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }, []);

  const showNextPopup = useCallback(() => {
    if (popupQueue.length > 0 && !currentPopup) {
      const nextPopup = popupQueue.shift()!;
      setCurrentPopup(nextPopup);
    }
  }, [currentPopup]);

  const dismissPopup = useCallback(() => {
    setCurrentPopup(null);
    // Auto-show next popup after a brief delay
    setTimeout(showNextPopup, 500);
  }, [showNextPopup]);

  // Auto-show first popup when queue has items
  useEffect(() => {
    if (!currentPopup && popupQueue.length > 0) {
      showNextPopup();
    }
  }, [currentPopup, showNextPopup]);

  return {
    currentPopup,
    pushPopup,
    subscribe,
    dismissPopup
  };
};