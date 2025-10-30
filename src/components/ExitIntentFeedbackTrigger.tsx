import { useState, useEffect } from "react";
import { ExitIntentMiniModal } from "./ExitIntentMiniModal";
import { AppFeedbackIntroModal } from "./AppFeedbackIntroModal";
import { AppFeedbackSurvey } from "./AppFeedbackSurvey";
import { useAppFeedback, type FeedbackRole } from "@/hooks/useAppFeedback";
import { useExitIntent } from "@/hooks/useExitIntent";
import { feedbackSessionManager } from "@/utils/feedbackSessionManager";

interface ExitIntentFeedbackTriggerProps {
  role: FeedbackRole;
  sourceAction: string;
}

export const ExitIntentFeedbackTrigger = ({ role, sourceAction }: ExitIntentFeedbackTriggerProps) => {
  const [showMiniModal, setShowMiniModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const { canShowFeedback } = useAppFeedback();

  const feedbackSubmitted = feedbackSessionManager.hasFeedbackSubmitted();
  const exitFeedbackShown = feedbackSessionManager.hasExitFeedbackShown();

  const shouldEnable = !feedbackSubmitted && !exitFeedbackShown && canShowFeedback;

  const handleExitIntent = () => {
    if (shouldEnable) {
      setShowMiniModal(true);
    }
  };

  useExitIntent({
    enabled: shouldEnable,
    onExitIntent: handleExitIntent,
    delay: 1500,
  });

  const handleMiniModalYes = () => {
    feedbackSessionManager.markExitFeedbackShown();
    setShowIntroModal(true);
  };

  const handleMiniModalDismiss = () => {
    feedbackSessionManager.markExitFeedbackShown();
  };

  const handleSurveyClose = (open: boolean) => {
    setShowSurvey(open);
    if (!open) {
      // Mark as submitted when survey is completed
      feedbackSessionManager.markFeedbackSubmitted();
    }
  };

  return (
    <>
      <ExitIntentMiniModal
        open={showMiniModal}
        onOpenChange={setShowMiniModal}
        onYes={handleMiniModalYes}
        onDismiss={handleMiniModalDismiss}
      />
      <AppFeedbackIntroModal
        open={showIntroModal}
        onOpenChange={setShowIntroModal}
        onYes={() => setShowSurvey(true)}
      />
      <AppFeedbackSurvey
        open={showSurvey}
        onOpenChange={handleSurveyClose}
        role={role}
        sourceAction={sourceAction}
      />
    </>
  );
};
