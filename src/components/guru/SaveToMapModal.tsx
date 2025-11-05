import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface SaveToMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  locationName?: string;
  placeId?: string | null;
}

export function SaveToMapModal({ open, onOpenChange }: SaveToMapModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to Map</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <AlertCircle className="h-5 w-5" />
          <p>This feature is temporarily unavailable.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
