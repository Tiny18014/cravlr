import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RecommenderLevelBadge } from '@/components/RecommenderLevelBadge';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SettingsAccountCardProps {
  userName: string;
  userLevel: string;
  userPoints: number;
  profileImageUrl: string | null;
  onImageChange: (url: string | null) => void;
  onEditProfile: () => void;
}

const getLevelThresholds = () => [
  { level: 'Newbie', min: 0, max: 49 },
  { level: 'Explorer', min: 50, max: 149 },
  { level: 'Trusted', min: 150, max: 299 },
  { level: 'Expert', min: 300, max: 599 },
  { level: 'Verified Guru', min: 600, max: Infinity },
];

export const SettingsAccountCard = ({
  userName,
  userLevel,
  userPoints,
  profileImageUrl,
  onImageChange,
  onEditProfile,
}: SettingsAccountCardProps) => {
  const thresholds = getLevelThresholds();
  const currentLevelIndex = thresholds.findIndex((t) => t.level === userLevel);
  const currentThreshold = thresholds[currentLevelIndex] || thresholds[0];
  const nextThreshold = thresholds[currentLevelIndex + 1];
  
  const isMaxLevel = !nextThreshold;
  const pointsInLevel = userPoints - currentThreshold.min;
  const pointsNeeded = isMaxLevel ? 0 : nextThreshold.min - userPoints;
  const levelRange = isMaxLevel ? 1 : nextThreshold.min - currentThreshold.min;
  const progressPercent = isMaxLevel ? 100 : Math.min((pointsInLevel / levelRange) * 100, 100);

  return (
    <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Profile Photo Section */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          <ProfilePictureUpload
            currentImageUrl={profileImageUrl}
            displayName={userName}
            onImageChange={onImageChange}
            size="lg"
          />
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground truncate">{userName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <RecommenderLevelBadge level={userLevel} size="sm" />
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">XP Progress</span>
              <span className="font-medium text-foreground">
                {isMaxLevel ? 'Max Level!' : `${pointsNeeded} pts to ${nextThreshold?.level}`}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{userPoints} points total</span>
              {!isMaxLevel && <span>{pointsInLevel}/{levelRange}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile}
              className="flex-1 sm:flex-none"
            >
              Edit Profile
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  How to earn points
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>How to Earn Points</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Earn points by being an active recommender in the Cravlr community!
                  </p>
                  <div className="space-y-3">
                    {[
                      { action: 'Make a recommendation', points: '+5 pts' },
                      { action: 'Receive a thumbs up', points: '+5 pts' },
                      { action: 'Receive a comment', points: '+5 pts' },
                      { action: 'Receive photo feedback', points: '+5 pts' },
                    ].map((item) => (
                      <div key={item.action} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-sm text-foreground">{item.action}</span>
                        <span className="text-sm font-semibold text-primary">{item.points}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-sm mb-2">Level Thresholds</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Newbie</span><span>0-49 pts</span></div>
                      <div className="flex justify-between"><span>Explorer</span><span>50-149 pts</span></div>
                      <div className="flex justify-between"><span>Trusted</span><span>150-299 pts</span></div>
                      <div className="flex justify-between"><span>Expert</span><span>300-599 pts</span></div>
                      <div className="flex justify-between"><span>Verified Guru</span><span>600+ pts</span></div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};
