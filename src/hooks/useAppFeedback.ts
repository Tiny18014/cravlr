import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type FeedbackRole = 'requester' | 'recommender';

interface SubmitAppFeedbackParams {
  role: FeedbackRole;
  experienceTags: string[];
  feedbackText: string;
  rating: number;
  sourceAction: string;
}

export const useAppFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [canShowFeedback, setCanShowFeedback] = useState(false);
  const [lastFeedbackTime, setLastFeedbackTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkFeedbackCooldown();
    }
  }, [user]);

  const checkFeedbackCooldown = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('app_feedback')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const lastFeedback = new Date(data.created_at);
        setLastFeedbackTime(lastFeedback);
        
        const daysSinceLastFeedback = Math.floor(
          (Date.now() - lastFeedback.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        setCanShowFeedback(daysSinceLastFeedback >= 7);
      } else {
        setCanShowFeedback(true);
      }
    } catch (err) {
      console.error('Error checking feedback cooldown:', err);
      setCanShowFeedback(true);
    }
  };

  const submitFeedback = async ({
    role,
    experienceTags,
    feedbackText,
    rating,
    sourceAction,
  }: SubmitAppFeedbackParams) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit feedback.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('app_feedback').insert({
        user_id: user.id,
        role,
        experience_tags: experienceTags,
        feedback_text: feedbackText,
        rating,
        source_action: sourceAction,
      });

      if (error) throw error;

      toast({
        title: "Thanks! Your feedback helps make Cravlr even better ❤️🍜",
      });

      await checkFeedbackCooldown();
      return true;
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitFeedback,
    canShowFeedback,
    lastFeedbackTime,
    loading,
    checkFeedbackCooldown,
  };
};
