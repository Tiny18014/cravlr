import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareHeart } from "lucide-react";

interface AppFeedbackIntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onYes: () => void;
  onDismiss?: () => void;
}

export const AppFeedbackIntroModal = ({ open, onOpenChange, onYes, onDismiss }: AppFeedbackIntroModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <MessageSquareHeart className="w-12 h-12 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-['Poppins']">
            🥢 Your Move, Foodie!
          </DialogTitle>
          <DialogDescription className="text-center text-base font-['Nunito']">
            Tell us how Cravlr's treating your taste today 🍜
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => {
              onOpenChange(false);
              onYes();
            }}
            className="w-full"
          >
            Yes, sure!
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onDismiss?.();
            }}
            className="w-full"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
