import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquareHeart, Users, Star } from "lucide-react";
import { AppFeedbackTrigger } from "./AppFeedbackTrigger";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeedbackRole } from "@/hooks/useAppFeedback";

export const FeedbackButtonWithRoleChoice = () => {
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [selectedRole, setSelectedRole] = useState<FeedbackRole | null>(null);
  const [triggerFeedback, setTriggerFeedback] = useState(false);
  const { user } = useAuth();

  const handleRoleSelect = (role: FeedbackRole) => {
    setSelectedRole(role);
    setShowRoleChoice(false);
    setTriggerFeedback(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowRoleChoice(true)}
        className="gap-2 w-full"
      >
        <MessageSquareHeart className="h-4 w-4" />
        Give Feedback
      </Button>

      <Dialog open={showRoleChoice} onOpenChange={setShowRoleChoice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Your Role</DialogTitle>
            <DialogDescription>
              Which type of feedback would you like to provide?
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Button
              onClick={() => handleRoleSelect('requester')}
              className="h-auto py-4 flex items-start gap-3"
              variant="outline"
            >
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold">As a Requester</div>
                <div className="text-sm text-muted-foreground">
                  Share feedback about requesting recommendations
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleRoleSelect('recommender')}
              className="h-auto py-4 flex items-start gap-3"
              variant="outline"
            >
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold">As a Recommender</div>
                <div className="text-sm text-muted-foreground">
                  Share feedback about giving recommendations
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {user && selectedRole && (
        <AppFeedbackTrigger
          role={selectedRole}
          sourceAction="feedback_button_with_role_choice"
          shouldTrigger={triggerFeedback}
          onTriggered={() => setTriggerFeedback(false)}
          onComplete={() => {
            setTriggerFeedback(false);
            setSelectedRole(null);
          }}
        />
      )}
    </>
  );
};
