import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FeedbackType = 'thumbs_up' | 'thumbs_down';

interface SubmitFeedbackParams {
  recommendationId: string;
  feedbackType: FeedbackType;
  starRating?: number;
}

export const useFeedback = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async ({ recommendationId, feedbackType, starRating }: SubmitFeedbackParams) => {
    setLoading(true);
    try {
      console.log('🎯 Submitting feedback:', { recommendationId, feedbackType, starRating });

      const { error } = await supabase
        .from('recommendation_feedback')
        .upsert({
          recommendation_id: recommendationId,
          requester_id: (await supabase.auth.getUser()).data.user?.id,
          feedback_type: feedbackType,
          star_rating: starRating
        });

      if (error) {
        console.error('❌ Error submitting feedback:', error);
        toast({
          title: "Error",
          description: "Failed to submit feedback. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Award points for positive feedback
      if (feedbackType === 'thumbs_up') {
        console.log('🎯 Awarding points for positive feedback...');
        
        // Calculate base points (50 for thumbs up) and bonus for star rating
        const basePoints = 50;
        const feedbackBonus = starRating ? Math.max(0, (starRating - 3) * 10) : 0; // 0-20 bonus for 4-5 stars
        const totalPoints = basePoints + feedbackBonus;
        
        const { error: awardError } = await supabase.functions.invoke('award-points', {
          body: {
            recommendationId: recommendationId,
            points: totalPoints
          }
        });

        if (awardError) {
          console.error('❌ Error awarding points:', awardError);
          // Don't fail the feedback submission if point awarding fails
        } else {
          console.log('✅ Points awarded successfully:', totalPoints);
        }
      }

      toast({
        title: "Feedback submitted",
        description: `Thank you for your ${feedbackType === 'thumbs_up' ? 'positive' : ''} feedback!`,
      });

      console.log('✅ Feedback submitted successfully');
      return true;
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getFeedback = async (recommendationId: string) => {
    try {
      const { data, error } = await supabase
        .from('recommendation_feedback')
        .select('*')
        .eq('recommendation_id', recommendationId)
        .eq('requester_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching feedback:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error fetching feedback:', err);
      return null;
    }
  };

  return {
    submitFeedback,
    getFeedback,
    loading
  };
};