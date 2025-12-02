import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock } from 'lucide-react';

interface VisitReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendationId: string;
  requestId: string;
  restaurantName: string;
  foodType: string;
  onDismiss?: () => void;
}

export const VisitReminderModal = ({
  open,
  onOpenChange,
  recommendationId,
  requestId,
  restaurantName,
  foodType,
  onDismiss,
}: VisitReminderModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showRemindOptions, setShowRemindOptions] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResponse = async (response: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('handle-visit-response', {
        body: { recommendationId, response },
      });

      if (error) throw error;

      if (response === 'visited') {
        toast({
          title: 'Great!',
          description: 'Please share your feedback',
        });
        onDismiss?.();
        onOpenChange(false);
        navigate(`/feedback/${recommendationId}`);
      } else if (response === 'remind_3h' || response === 'maybe_later') {
        toast({
          title: 'Reminder set',
          description: "We'll remind you again in 3 hours",
        });
        onDismiss?.();
        onOpenChange(false);
        navigate(`/request-results/${requestId}`);
      } else if (response === 'no_reminder') {
        toast({
          title: 'Got it',
          description: 'No problem! Thanks for letting us know',
        });
        onDismiss?.();
        onOpenChange(false);
        navigate(`/request-results/${requestId}`);
      } else if (response === 'not_visited') {
        toast({
          title: 'Thanks for letting us know',
          description: 'Maybe next time!',
        });
        onDismiss?.();
        onOpenChange(false);
        navigate(`/request-results/${requestId}`);
      }
    } catch (error) {
      console.error('Error handling visit response:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (showRemindOptions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">
              Would you like a reminder?
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleResponse('remind_3h')}
              disabled={loading}
              className="w-full h-auto py-4 text-base"
            >
              <Clock className="mr-2 h-5 w-5" />
              Remind me in 3 hours
            </Button>
            <Button
              onClick={() => handleResponse('no_reminder')}
              disabled={loading}
              variant="outline"
              className="w-full h-auto py-4 text-base"
            >
              No reminder needed
            </Button>
            <Button
              onClick={() => handleResponse('not_visited')}
              disabled={loading}
              variant="ghost"
              className="w-full h-auto py-4 text-base text-muted-foreground"
            >
              I will not go
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Did you visit the restaurant?
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 mb-6">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-base">{restaurantName}</p>
              <p className="text-sm text-muted-foreground">{foodType}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleResponse('visited')}
              disabled={loading}
              className="w-full h-auto py-4 text-base bg-gradient-to-r from-primary to-primary-dark"
            >
              Yes, I visited ✓
            </Button>
            <Button
              onClick={() => setShowRemindOptions(true)}
              disabled={loading}
              variant="outline"
              className="w-full h-auto py-4 text-base"
            >
              No
            </Button>
            <Button
              onClick={() => handleResponse('maybe_later')}
              disabled={loading}
              variant="ghost"
              className="w-full h-auto py-4 text-base text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};