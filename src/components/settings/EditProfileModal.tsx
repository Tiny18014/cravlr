import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  currentPhone: string;
  onSave: (name: string, phone: string) => Promise<void>;
}

export const EditProfileModal = ({ 
  open, 
  onOpenChange, 
  currentName,
  currentPhone,
  onSave 
}: EditProfileModalProps) => {
  const [displayName, setDisplayName] = useState(currentName);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      await onSave(displayName.trim(), phoneNumber.trim());
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
            <p className="text-xs text-muted-foreground">
              This is how other users will see you in the app
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
            <p className="text-xs text-muted-foreground">
              Used for notifications and account recovery
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
