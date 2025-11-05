import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface AddPlaceModalProps {
  open: boolean;
  onClose: () => void;
  mapId: string;
  onPlaceAdded: () => void;
}

export function AddPlaceModal({ open, onClose }: AddPlaceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Place</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <AlertCircle className="h-5 w-5" />
          <p>Adding places is temporarily unavailable.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
