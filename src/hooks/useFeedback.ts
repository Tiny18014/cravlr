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