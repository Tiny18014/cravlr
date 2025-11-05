import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreakPopupProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
  points: number;
}

export const StreakPopup = ({ isOpen, onClose, streakCount, points }: StreakPopupProps) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFirstRecommendation = streakCount === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="relative max-w-md w-full mx-4 p-6 shadow-lg animate-scale-in">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="text-center space-y-4">
          <div className="text-6xl mb-2">
            {isFirstRecommendation ? '🎉' : '🔥'}
          </div>
          
          <h2 className="text-2xl font-bold">
            Congratulations!
          </h2>
          
          <div className="space-y-2">
            {isFirstRecommendation ? (
              <>
                <p className="text-lg">
                  You just started your Cravlr streak! 🍜
                </p>
                <p className="text-base text-muted-foreground">
                  You earned <span className="font-bold text-primary">{points} points</span> for your first recommendation. 🔥
                </p>
              </>
            ) : (
              <>
                <p className="text-lg">
                  You earned <span className="font-bold text-primary">{points} points</span> for this recommendation! 🍕
                </p>
                <p className="text-base text-muted-foreground">
                  Keep the streak going — every rec counts!
                </p>
              </>
            )}
          </div>
          
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <span className="text-sm font-semibold">Current Streak:</span>
              <span className="text-xl font-bold text-primary">{streakCount}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};