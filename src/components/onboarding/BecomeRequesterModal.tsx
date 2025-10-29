import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search } from 'lucide-react';

interface BecomeRequesterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

export const BecomeRequesterModal: React.FC<BecomeRequesterModalProps> = ({
  open,
  onOpenChange,
  onContinue,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Search className="h-6 w-6 text-primary-foreground" />
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            Start requesting?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Set your request preferences so locals can help you discover amazing food.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col gap-2">
          <AlertDialogAction onClick={onContinue} className="w-full">
            Continue
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-0">
            Not now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
