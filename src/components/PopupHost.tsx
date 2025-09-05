import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { usePopupBus } from '@/hooks/usePopupBus';

export const PopupHost: React.FC = () => {
  const { currentPopup, dismissPopup } = usePopupBus();
  const navigate = useNavigate();

  const handleAction = () => {
    if (currentPopup?.cta?.to) {
      navigate(currentPopup.cta.to);
    }
    dismissPopup();
  };

  if (!currentPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="mx-4 max-w-md bg-background border-2 border-primary/20 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="flex items-start justify-between p-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {currentPopup.title}
            </h3>
            <p className="text-muted-foreground mb-4">
              {currentPopup.message}
            </p>
            <div className="flex gap-2">
              {currentPopup.cta && (
                <Button 
                  onClick={handleAction}
                  className="flex-1"
                >
                  {currentPopup.cta.label}
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={dismissPopup}
                className="flex-1"
              >
                {currentPopup.cta ? 'Later' : 'OK'}
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissPopup}
            className="ml-2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};