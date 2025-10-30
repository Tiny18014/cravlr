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

const experienceOptions = [
  "Easy to use",
  "Took too long to find results",
  "Love the recommendations flow",
  "Had issues with login or speed",
  "Other",
];

export const AppFeedbackSurvey = ({ open, onOpenChange, role, sourceAction }: AppFeedbackSurveyProps) => {
  const [step, setStep] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const { submitFeedback, loading } = useAppFeedback();

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleNext = () => {
    if (step < 3) {
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

    const success = await submitFeedback({
      role,
      experienceTags: tags,
      feedbackText,
      rating,
      sourceAction,
    });

    if (success) {
      // Reset form
      setStep(1);
      setSelectedTags([]);
      setOtherText("");
      setFeedbackText("");
      setRating(0);
      onOpenChange(false);
    }
  };

  const canProceedStep1 = selectedTags.length > 0 && (!selectedTags.includes("Other") || otherText.trim());
  const canProceedStep3 = rating > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            Share Your Feedback
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Step {step} of 3
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Multiple Choice */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base">
                What best describes your experience today on Cravlr?
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

          {/* Step 2: Text Input */}
          {step === 2 && (
            <div className="space-y-4">
              <Label htmlFor="feedback-text" className="text-base">
                Anything we could make easier for you?
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
            </div>
          )}

          {/* Step 3: Star Rating */}
          {step === 3 && (
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
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 && !canProceedStep1}
              className="flex-1"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceedStep3 || loading}
              className="flex-1"
            >
              {loading ? "Sending..." : "Send Feedback"}
            </Button>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                step >= dot ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
