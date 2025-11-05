import { useEffect, useState, useCallback } from 'react';

interface UseExitIntentProps {
  enabled: boolean;
  onExitIntent: () => void;
  delay?: number;
}

export const useExitIntent = ({ enabled, onExitIntent, delay = 1500 }: UseExitIntentProps) => {
  const [hasTriggered, setHasTriggered] = useState(false);
  const [delayTimer, setDelayTimer] = useState<NodeJS.Timeout | null>(null);

  const triggerWithDelay = useCallback(() => {
    if (hasTriggered || !enabled) return;
    
    const timer = setTimeout(() => {
      setHasTriggered(true);
      onExitIntent();
    }, delay);
    
    setDelayTimer(timer);
  }, [hasTriggered, enabled, onExitIntent, delay]);

  useEffect(() => {
    // TEMPORARILY DISABLED: Exit intent detection
    // Uncomment the code below to re-enable exit-intent popups
    
    /*
    if (!enabled) return;

    // Desktop: Mouse leaving viewport towards top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        triggerWithDelay();
      }
    };

    // Mobile/Desktop: Before unload
    const handleBeforeUnload = () => {
      if (!hasTriggered) {
        // Can't show UI on beforeunload, so we just mark it
        // The actual trigger will happen on visibility change
        triggerWithDelay();
      }
    };

    // Visibility change (tab switching, going back)
    const handleVisibilityChange = () => {
      if (document.hidden && !hasTriggered) {
        triggerWithDelay();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (delayTimer) clearTimeout(delayTimer);
    };
    */
  }, [enabled, hasTriggered, triggerWithDelay, delayTimer]);

  return { hasTriggered };
};
