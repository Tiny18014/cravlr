import React, { useState, useEffect } from 'react';
import { User, AlertTriangle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PhoneInput } from '@/components/PhoneInput';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(currentName);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Get user email from auth context
  const userEmail = user?.email || '';

  // Reset form when modal opens with new values
  useEffect(() => {
    if (open) {
      setDisplayName(currentName);
      setPhoneNumber(currentPhone || '');
      setError('');
      setShowDuplicateDialog(false);
    }
  }, [open, currentName, currentPhone]);

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
      // Check if it's a duplicate phone error
      if (err.message?.toLowerCase().includes('phone number already exists')) {
        setShowDuplicateDialog(true);
      } else {
        setError(err.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateDialogClose = () => {
    setShowDuplicateDialog(false);
    setPhoneNumber(''); // Clear phone to let user enter a different one
  };

  return (
    <>
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

            {/* Name Field - Editable */}
            <div className="space-y-2">
              <Label htmlFor="display-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Name
              </Label>
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

            {/* Email Field - Read-only */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                value={userEmail}
                disabled
                readOnly
                className="bg-muted/50 cursor-not-allowed text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Phone Field - Editable (no "(optional)" label) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number
              </Label>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="555 123 4567"
              />
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

      {/* Duplicate Phone Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Phone Number Already Registered</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              An account with this phone number already exists. Please use a different phone number.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleDuplicateDialogClose}>
              Use Different Number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
