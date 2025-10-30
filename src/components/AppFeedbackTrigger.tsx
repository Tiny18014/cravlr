import { useState, useEffect } from "react";
import { AppFeedbackIntroModal } from "./AppFeedbackIntroModal";
import { AppFeedbackSurvey } from "./AppFeedbackSurvey";
import { useAppFeedback, type FeedbackRole } from "@/hooks/useAppFeedback";

interface AppFeedbackTriggerProps {
  role: FeedbackRole;
  sourceAction: string;
  shouldTrigger: boolean;
  onTriggered?: () => void;
  onComplete?: () => void;
}

export const AppFeedbackTrigger = ({
  role,
  sourceAction,
  shouldTrigger,
  onTriggered,
  onComplete,
}: AppFeedbackTriggerProps) => {
  const [showIntro, setShowIntro] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const { canShowFeedback } = useAppFeedback();

  useEffect(() => {
    if (shouldTrigger && canShowFeedback) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowIntro(true);
        onTriggered?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldTrigger, canShowFeedback, onTriggered]);

  return (
    <>
      <AppFeedbackIntroModal
        open={showIntro}
        onOpenChange={setShowIntro}
        onYes={() => setShowSurvey(true)}
        onDismiss={onComplete}
      />
      <AppFeedbackSurvey
        open={showSurvey}
        onOpenChange={(open) => {
          setShowSurvey(open);
          if (!open) {
            onComplete?.();
          }
        }}
        role={role}
        sourceAction={sourceAction}
      />
    </>
  );
};
