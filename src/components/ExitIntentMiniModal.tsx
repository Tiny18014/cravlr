import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

interface ExitIntentMiniModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onYes: () => void;
  onDismiss: () => void;
}

export const ExitIntentMiniModal = ({ open, onOpenChange, onYes, onDismiss }: ExitIntentMiniModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <UtensilsCrossed className="w-12 h-12 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-['Poppins']">
            🍜 Leaving already?
          </DialogTitle>
          <DialogDescription className="text-center text-base font-['Nunito']">
            Got a sec to help make Cravlr even tastier?
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
            Sure!
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onDismiss();
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
