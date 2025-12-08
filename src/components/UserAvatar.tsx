import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export interface UserAvatarProps {
  userId?: string;
  profileImageUrl?: string | null;
  profileImageUpdatedAt?: string | null;
  displayName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallbackIcon?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-xl',
};

const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

/**
 * UserAvatar - Single source of truth for displaying user avatars
 * 
 * Use this component everywhere user profile pictures are displayed.
 * It handles:
 * - Profile image URL with cache busting
 * - Fallback to initials or icon
 * - Consistent sizing across the app
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  profileImageUrl,
  profileImageUpdatedAt,
  displayName,
  size = 'md',
  className,
  showFallbackIcon = true,
}) => {
  // Generate cache-busted image URL
  const imageUrl = React.useMemo(() => {
    if (!profileImageUrl) return undefined;
    
    // Append cache-busting query param if we have an updated timestamp
    if (profileImageUpdatedAt) {
      const timestamp = new Date(profileImageUpdatedAt).getTime();
      const separator = profileImageUrl.includes('?') ? '&' : '?';
      return `${profileImageUrl}${separator}v=${timestamp}`;
    }
    
    return profileImageUrl;
  }, [profileImageUrl, profileImageUpdatedAt]);

  // Generate initials from display name
  const initials = React.useMemo(() => {
    if (!displayName) return '';
    
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '';
  }, [displayName]);

  return (
    <Avatar className={cn(sizeClasses[size], "border-2 border-border", className)}>
      <AvatarImage 
        src={imageUrl} 
        alt={displayName || 'User avatar'} 
      />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials || (showFallbackIcon ? (
          <User className={cn(iconSizes[size], "text-muted-foreground")} />
        ) : null)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
