import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import { useAppFeedback, type FeedbackRole } from "@/hooks/useAppFeedback";
import { cn } from "@/lib/utils";

interface AppFeedbackSurveyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: FeedbackRole;
  sourceAction: string;
}

const requesterExperienceOptions = [
  "Easy to use",
  "Took too long to find results",
  "Love the recommendations flow",
  "Had issues with login or speed",
  "Other",
];

const recommenderExperienceOptions = [
  "Yes, I love it!",
  "It's okay so far",
  "I'd like it to be easier",
  "Not really enjoying it",
  "Other",
];

const planningToGoOptions = ["Yes", "Maybe", "Not sure"];

export const AppFeedbackSurvey = ({ open, onOpenChange, role, sourceAction }: AppFeedbackSurveyProps) => {
  const [step, setStep] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [planningToGo, setPlanningToGo] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const { submitFeedback, loading } = useAppFeedback();

  const maxSteps = role === 'requester' ? 4 : 3;
  const experienceOptions = role === 'requester' ? requesterExperienceOptions : recommenderExperienceOptions;

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleNext = () => {
    if (step < maxSteps) {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    if (step < maxSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    const tags = selectedTags.includes("Other") && otherText
      ? [...selectedTags.filter((t) => t !== "Other"), `Other: ${otherText}`]
      : selectedTags;

    // Add planning to go answer for requesters
    const finalTags = role === 'requester' && planningToGo 
      ? [...tags, `Planning to visit: ${planningToGo}`]
      : tags;

    const success = await submitFeedback({
      role,
      experienceTags: finalTags,
      feedbackText,
      rating,
      sourceAction,
    });

    if (success) {
      // Show thank you message
      setShowThankYou(true);
      
      // Close after 3 seconds
      setTimeout(() => {
        // Reset form
        setStep(1);
        setSelectedTags([]);
        setOtherText("");
        setPlanningToGo("");
        setFeedbackText("");
        setRating(0);
        setShowThankYou(false);
        onOpenChange(false);
      }, 3000);
    }
  };

  const canProceedStep1 = selectedTags.length > 0 && (!selectedTags.includes("Other") || otherText.trim());
  const canProceedStep2Requester = planningToGo !== "";
  const canSubmit = rating > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {showThankYou ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="text-4xl mb-4">{role === 'requester' ? '❤️🍜' : '🍽️'}</div>
            <p className="text-lg font-semibold text-center">
              {role === 'requester' 
                ? "Thanks for your feedback! We're happy you're finding great places ❤️🍜"
                : "Thanks for helping others discover great food! 🍽️ Your feedback makes Cravlr better"}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                Share Your Feedback
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Step {step} of {maxSteps}
              </p>
            </DialogHeader>

            <div className="space-y-4">
          {/* Step 1: Multiple Choice - Experience or Enjoyment */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base">
                {role === 'requester' 
                  ? "What best describes your experience today on Cravlr?"
                  : "Are you enjoying recommending food on Cravlr?"}
              </Label>
              <div className="space-y-3">
                {experienceOptions.map((option) => (
                  <div key={option} className="flex items-start space-x-3">
                    <Checkbox
                      id={option}
                      checked={selectedTags.includes(option)}
                      onCheckedChange={() => handleTagToggle(option)}
                    />
                    <label
                      htmlFor={option}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              {selectedTags.includes("Other") && (
                <Textarea
                  placeholder="Please specify..."
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  maxLength={200}
                  className="mt-2"
                />
              )}
            </div>
          )}

          {/* Step 2 for Requester: Planning to go */}
          {step === 2 && role === 'requester' && (
            <div className="space-y-4">
              <Label className="text-base">
                Are you planning to go to the place recommended?
              </Label>
              <div className="space-y-3">
                {planningToGoOptions.map((option) => (
                  <div key={option} className="flex items-start space-x-3">
                    <Checkbox
                      id={`planning-${option}`}
                      checked={planningToGo === option}
                      onCheckedChange={() => setPlanningToGo(option)}
                    />
                    <label
                      htmlFor={`planning-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 for Recommender OR Step 3 for Requester: Optional Suggestions */}
          {((step === 2 && role === 'recommender') || (step === 3 && role === 'requester')) && (
            <div className="space-y-4">
              <Label htmlFor="feedback-text" className="text-base">
                {role === 'requester' 
                  ? "Do you have any suggestions to improve Cravlr?"
                  : "Anything we could make better for you?"}
              </Label>
              <Textarea
                id="feedback-text"
                placeholder="Your thoughts here..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                maxLength={200}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {feedbackText.length}/200
              </p>
              <p className="text-xs text-muted-foreground text-center">
                You can skip this step
              </p>
            </div>
          )}

          {/* Final Step: Star Rating */}
          {((step === 3 && role === 'recommender') || (step === 4 && role === 'requester')) && (
            <div className="space-y-4">
              <Label className="text-base">
                How would you rate Cravlr overall?
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
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          {step < maxSteps ? (
            <>
              {/* Show Skip button on optional text input steps */}
              {((step === 2 && role === 'recommender') || (step === 3 && role === 'requester')) && (
                <Button variant="outline" onClick={handleSkip} className="flex-1">
                  Skip
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && role === 'requester' && !canProceedStep2Requester)
                }
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1"
            >
              {loading ? "Sending..." : "Send Feedback"}
            </Button>
          )}
        </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: maxSteps }, (_, i) => i + 1).map((dot) => (
                <div
                  key={dot}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    step >= dot ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
