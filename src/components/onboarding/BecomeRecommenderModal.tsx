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
import { ChefHat } from 'lucide-react';

interface BecomeRecommenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

export const BecomeRecommenderModal: React.FC<BecomeRecommenderModalProps> = ({
  open,
  onOpenChange,
  onContinue,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            Become a Recommender
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Share your expertise and help locals discover great food. We'll need to set up your recommender profile first.
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
