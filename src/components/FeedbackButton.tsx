import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquareHeart } from "lucide-react";
import { AppFeedbackTrigger } from "./AppFeedbackTrigger";
import { useAuth } from "@/contexts/AuthContext";

export const FeedbackButton = () => {
  const [triggerFeedback, setTriggerFeedback] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTriggerFeedback(true)}
        className="gap-2"
      >
        <MessageSquareHeart className="h-4 w-4" />
        Feedback
      </Button>
      
      {user && (
        <AppFeedbackTrigger
          role="requester"
          sourceAction="feedback_button_click"
          shouldTrigger={triggerFeedback}
          onTriggered={() => setTriggerFeedback(false)}
          onComplete={() => setTriggerFeedback(false)}
        />
      )}
    </>
  );
};
