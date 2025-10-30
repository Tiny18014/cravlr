import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareHeart } from "lucide-react";

interface AppFeedbackIntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onYes: () => void;
}

export const AppFeedbackIntroModal = ({ open, onOpenChange, onYes }: AppFeedbackIntroModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <MessageSquareHeart className="w-12 h-12 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Do you have a few seconds to share your feedback?
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your thoughts help us make Cravlr even better!
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
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
