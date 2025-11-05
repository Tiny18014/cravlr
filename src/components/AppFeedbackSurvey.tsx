import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useAppFeedback, type FeedbackRole } from "@/hooks/useAppFeedback";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AppFeedbackSurveyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: FeedbackRole;
  sourceAction: string;
}

const requesterExperienceOptions = [
  { label: "👍 Great", value: "Great" },
  { label: "😐 Okay", value: "Okay" },
  { label: "👎 Needs improvement", value: "Needs improvement" },
];

const recommenderExperienceOptions = [
  { label: "Yes, I love it!", value: "Yes, I love it!" },
  { label: "I'd like it to be easier", value: "I'd like it to be easier" },
  { label: "Not really enjoying it", value: "Not really enjoying it" },
];

const planningToGoOptions = [
  { label: "Yes", value: "Yes" },
  { label: "Maybe", value: "Maybe" },
  { label: "Not sure", value: "Not sure" },
];

export const AppFeedbackSurvey = ({ open, onOpenChange, role, sourceAction }: AppFeedbackSurveyProps) => {
  const [experience, setExperience] = useState("");
  const [planningToGo, setPlanningToGo] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const { submitFeedback, loading } = useAppFeedback();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    const tags = [experience];
    if (role === 'requester' && planningToGo) {
      tags.push(`Planning to visit: ${planningToGo}`);
    }

    const success = await submitFeedback({
      role,
      experienceTags: tags,
      feedbackText,
      rating,
      sourceAction,
    });

    if (success) {
      // Update last_feedback_date for recommenders
      if (role === 'recommender' && user) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ last_feedback_date: new Date().toISOString() })
            .eq('id', user.id);

          if (error) {
            console.error('Error updating last_feedback_date:', error);
          } else {
            toast({
              title: "Thanks for your feedback!",
              description: "You're helping make Cravlr better.",
            });
          }
        } catch (err) {
          console.error('Error updating last_feedback_date:', err);
        }
      }

      setShowThankYou(true);
      
      setTimeout(() => {
        setExperience("");
        setPlanningToGo("");
        setFeedbackText("");
        setRating(0);
        setShowThankYou(false);
        onOpenChange(false);
      }, 3000);
    }
  };

  const canSubmit = experience !== "" && rating > 0 && (role === 'recommender' || planningToGo !== "");
  const experienceOptions = role === 'requester' ? requesterExperienceOptions : recommenderExperienceOptions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {showThankYou ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="text-4xl mb-4">❤️🍜</div>
            <p className="text-lg font-semibold text-center font-['Poppins']">
              You just made Cravlr tastier! Thanks for adding your flavor! ❤️🍜
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-['Poppins']">
                Hey Food Lover 💛
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center font-['Nunito'] mt-2">
                Tell us how your Cravlr journey tasted today!
              </p>
            </DialogHeader>

            <div className="space-y-6 font-['Nunito']">
              {/* Question 1: Experience */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  {role === 'requester' 
                    ? "How was your experience today on Cravlr?"
                    : "Are you enjoying recommending food on Cravlr?"}
                </Label>
                <div className="grid gap-2">
                  {experienceOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={experience === option.value ? "default" : "outline"}
                      onClick={() => setExperience(option.value)}
                      className="w-full justify-start text-left h-auto py-3"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Question 2: Planning to go (Requester only) */}
              {role === 'requester' && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Are you planning to go to the place recommended?
                  </Label>
                  <div className="grid gap-2">
                    {planningToGoOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={planningToGo === option.value ? "default" : "outline"}
                        onClick={() => setPlanningToGo(option.value)}
                        className="w-full justify-start text-left h-auto py-3"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Question 3: Optional Feedback */}
              <div className="space-y-3">
                <Label htmlFor="feedback-text" className="text-base font-medium">
                  {role === 'requester' 
                    ? "Anything we could make better?"
                    : "Anything we could make better for you?"}
                  <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                </Label>
                <Textarea
                  id="feedback-text"
                  placeholder="Your thoughts here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {feedbackText.length}/200
                </p>
              </div>

              {/* Question 4: Star Rating */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Give Cravlr a flavor score! ⭐
                </Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "w-10 h-10",
                          rating >= star
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="w-full h-12 text-base font-['Poppins']"
              >
                {loading ? "Sending..." : "Submit Feedback"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
