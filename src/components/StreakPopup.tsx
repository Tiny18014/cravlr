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
  const isFirstRecommendation = streakCount === 1;

  useEffect(() => {
    // Only auto-close for subsequent recommendations (not the first one)
    if (isOpen && !isFirstRecommendation) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, isFirstRecommendation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="relative max-w-md w-full mx-4 p-6 shadow-lg animate-scale-in">
        {/* Only show X button for subsequent recommendations (auto-closes) */}
        {!isFirstRecommendation && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <div className="text-center space-y-4">
          <div className="text-6xl mb-2">
            {isFirstRecommendation ? '🎉' : '👏'}
          </div>
          
          <h2 className="text-2xl font-bold">
            {isFirstRecommendation ? 'Congratulations!' : 'Great job!'}
          </h2>
          
          <div className="space-y-2">
            {isFirstRecommendation ? (
              <>
                <p className="text-lg">
                  You just started your Cravlr streak and earned {points} points!
                </p>
              </>
            ) : (
              <>
                <p className="text-lg">
                  You earned {points} more points for your latest recommendation.
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

          {/* Show Close button only for first recommendation */}
          {isFirstRecommendation && (
            <div className="pt-4">
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};