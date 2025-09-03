import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeedback, FeedbackType } from '@/hooks/useFeedback';

interface FeedbackButtonsProps {
  recommendationId: string;
  className?: string;
}

export const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ 
  recommendationId, 
  className 
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [showStarRating, setShowStarRating] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { submitFeedback, getFeedback, loading } = useFeedback();

  useEffect(() => {
    // Load existing feedback
    const loadFeedback = async () => {
      const feedback = await getFeedback(recommendationId);
      if (feedback) {
        setSelectedFeedback(feedback.feedback_type as FeedbackType);
        if (feedback.star_rating) {
          setStarRating(feedback.star_rating);
          setShowStarRating(true);
        }
      }
    };
    loadFeedback();
  }, [recommendationId]);

  const handleFeedbackClick = async (feedbackType: FeedbackType) => {
    if (selectedFeedback === feedbackType) return;

    setSelectedFeedback(feedbackType);

    if (feedbackType === 'thumbs_up') {
      setShowStarRating(true);
      // Don't submit yet, wait for optional star rating
    } else {
      // Submit immediately for thumbs down
      await submitFeedback({
        recommendationId,
        feedbackType
      });
      setShowStarRating(false);
      setStarRating(0);
    }
  };

  const handleStarClick = async (rating: number) => {
    setStarRating(rating);
    setShowStarRating(false);
    
    // Submit feedback with star rating
    await submitFeedback({
      recommendationId,
      feedbackType: 'thumbs_up',
      starRating: rating
    });
  };

  const handleSkipRating = async () => {
    setShowStarRating(false);
    
    // Submit thumbs up without star rating
    await submitFeedback({
      recommendationId,
      feedbackType: 'thumbs_up'
    });
  };

  if (selectedFeedback && !showStarRating) {
    return (
      <Card className={cn("p-3 bg-muted/50", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {selectedFeedback === 'thumbs_up' ? (
            <>
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <span>Thank you for your feedback!</span>
              {starRating > 0 && (
                <div className="flex">
                  {Array.from({ length: starRating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <span>Thanks for letting us know</span>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      {!showStarRating ? (
        <>
          <div className="text-sm font-medium mb-3">How was this recommendation?</div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFeedbackClick('thumbs_up')}
              disabled={loading}
              className={cn(
                "flex items-center gap-2",
                selectedFeedback === 'thumbs_up' && "border-green-600 text-green-600"
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              Helpful
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFeedbackClick('thumbs_down')}
              disabled={loading}
              className={cn(
                "flex items-center gap-2",
                selectedFeedback === 'thumbs_down' && "border-red-600 text-red-600"
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              Not helpful
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium mb-3">Rate your experience (optional)</div>
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleStarClick(i + 1)}
                onMouseEnter={() => setHoveredStar(i + 1)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 hover:scale-110 transition-transform"
                disabled={loading}
              >
                <Star 
                  className={cn(
                    "h-6 w-6 transition-colors",
                    (hoveredStar > i || starRating > i)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipRating}
            disabled={loading}
            className="text-xs text-muted-foreground"
          >
            Skip rating
          </Button>
        </>
      )}
    </Card>
  );
};