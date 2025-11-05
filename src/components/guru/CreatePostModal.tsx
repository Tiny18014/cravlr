import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <AlertCircle className="h-5 w-5" />
          <p>Post creation is temporarily unavailable.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
