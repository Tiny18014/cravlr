import React from 'react';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface ProfileCardProps {
  userName: string;
  profileImageUrl: string | null;
  onImageChange: (url: string | null) => void;
  onEditProfile: () => void;
}

export const ProfileCard = ({
  userName,
  profileImageUrl,
  onImageChange,
  onEditProfile,
}: ProfileCardProps) => {
  return (
    <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
      <div className="flex flex-col items-center text-center gap-4">
        {/* Profile Photo */}
        <ProfilePictureUpload
          currentImageUrl={profileImageUrl}
          displayName={userName}
          onImageChange={onImageChange}
          size="lg"
        />

        {/* Name Only */}
        <div>
          <h2 className="text-xl font-semibold text-foreground">{userName}</h2>
        </div>

        {/* Edit Profile Button */}
        <Button
          variant="outline"
          onClick={onEditProfile}
          className="w-full max-w-[200px] mt-2"
        >
          Edit Profile
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
