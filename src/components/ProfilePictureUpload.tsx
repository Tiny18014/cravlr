import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Trash2, User } from 'lucide-react';
import { useProfilePicture } from '@/hooks/useProfilePicture';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

interface ProfilePictureUploadProps {
  currentImageUrl?: string | null;
  displayName?: string;
  onImageChange?: (newUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

const buttonSizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  displayName = '',
  onImageChange,
  size = 'lg',
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, uploadProgress, uploadProfilePicture, deleteProfilePicture } = useProfilePicture();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const newUrl = await uploadProfilePicture(file);
    
    if (newUrl) {
      onImageChange?.(newUrl);
    } else {
      // Reset preview on failure
      setPreviewUrl(null);
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    const success = await deleteProfilePicture();
    if (success) {
      setPreviewUrl(null);
      onImageChange?.(null);
    }
  };

  const displayImage = previewUrl || currentImageUrl;

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
        <AvatarImage src={displayImage || undefined} alt={displayName} />
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <Progress value={uploadProgress} className="w-12 h-1 mt-1" />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute -bottom-1 -right-1 flex gap-1">
        {/* Upload Button */}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className={cn(
            buttonSizeClasses[size],
            "rounded-full shadow-md border border-border"
          )}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4" />
        </Button>

        {/* Delete Button (only show if there's an image) */}
        {displayImage && !isUploading && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className={cn(
                  buttonSizeClasses[size],
                  "rounded-full shadow-md"
                )}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove profile picture?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your profile picture will be permanently deleted. You can upload a new one anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
