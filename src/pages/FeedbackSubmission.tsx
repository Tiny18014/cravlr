import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ThumbsUp, ThumbsDown, Upload, Star } from 'lucide-react';

export default function FeedbackSubmission() {
  const { recommendationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [thumbsUp, setThumbsUp] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchRecommendation();
  }, [recommendationId]);

  const fetchRecommendation = async () => {
    if (!recommendationId) return;

    const { data, error } = await supabase
      .from('recommendations')
      .select('*, food_requests!inner(food_type, location_city)')
      .eq('id', recommendationId)
      .single();

    if (error) {
      console.error('Error fetching recommendation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recommendation',
        variant: 'destructive',
      });
      return;
    }

    setRecommendation(data);
  };

  const handleSubmit = async () => {
    if (thumbsUp === null) {
      toast({
        title: 'Please rate',
        description: 'Give a thumbs up or down before submitting',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-visit-feedback', {
        body: {
          recommendationId,
          thumbsUp,
          comment,
          photoUrls,
          visited: true,
        },
      });

      if (error) throw error;

      toast({
        title: 'Feedback submitted!',
        description: `Your recommender just earned ${data.pointsAwarded} Cravlr points! 🎉`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!recommendation) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader 
          onSignOut={signOut}
          userName={user?.email?.split('@')[0] || 'User'}
        />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        onSignOut={signOut}
        userName={user?.email?.split('@')[0] || 'User'}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">How was the recommendation?</h1>
            <p className="text-muted-foreground">
              Share your experience at {recommendation.restaurant_name}
            </p>
          </div>

          <div className="space-y-6">
            {/* Thumbs Rating */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Did you enjoy it? *
              </label>
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  variant={thumbsUp === true ? 'default' : 'outline'}
                  onClick={() => setThumbsUp(true)}
                  className={`flex-1 h-20 text-lg ${
                    thumbsUp === true
                      ? 'bg-gradient-to-r from-primary to-primary-dark'
                      : ''
                  }`}
                >
                  <ThumbsUp className="mr-2 h-6 w-6" />
                  Yes! Loved it
                </Button>
                <Button
                  size="lg"
                  variant={thumbsUp === false ? 'default' : 'outline'}
                  onClick={() => setThumbsUp(false)}
                  className={`flex-1 h-20 text-lg ${
                    thumbsUp === false
                      ? 'bg-gradient-to-r from-destructive to-destructive/80'
                      : ''
                  }`}
                >
                  <ThumbsDown className="mr-2 h-6 w-6" />
                  Not really
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                +5 points for your recommender
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Share your thoughts (Optional)
              </label>
              <Textarea
                placeholder="What did you think? Any highlights or suggestions?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                +5 points for your recommender if you write a comment
              </p>
            </div>

            {/* Photo Upload Placeholder */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Add photos (Optional)
              </label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Photo upload coming soon!
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  +5 points for your recommender when you add photos
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary-dark"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Your feedback helps improve recommendations for everyone! 🌟
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}