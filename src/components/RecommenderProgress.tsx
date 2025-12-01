import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RecommenderLevelBadge } from './RecommenderLevelBadge';

interface RecommenderProgressProps {
  level: string;
  currentPoints: number;
}

const getLevelThresholds = () => {
  return [
    { level: 'Newbie', min: 0, max: 49 },
    { level: 'Explorer', min: 50, max: 149 },
    { level: 'Trusted', min: 150, max: 299 },
    { level: 'Expert', min: 300, max: 599 },
    { level: 'Verified Guru', min: 600, max: Infinity },
  ];
};

export const RecommenderProgress = ({ level, currentPoints }: RecommenderProgressProps) => {
  const thresholds = getLevelThresholds();
  const currentLevelIndex = thresholds.findIndex((t) => t.level === level);
  const currentThreshold = thresholds[currentLevelIndex];
  const nextThreshold = thresholds[currentLevelIndex + 1];

  const isMaxLevel = !nextThreshold;
  const pointsInLevel = currentPoints - currentThreshold.min;
  const pointsNeeded = isMaxLevel ? 0 : nextThreshold.min - currentPoints;
  const levelRange = isMaxLevel ? 1 : nextThreshold.min - currentThreshold.min;
  const progressPercent = isMaxLevel ? 100 : (pointsInLevel / levelRange) * 100;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Your Level</h3>
            <p className="text-sm text-muted-foreground">
              {currentPoints} total points
            </p>
          </div>
          <RecommenderLevelBadge level={level} size="lg" />
        </div>

        {!isMaxLevel && (
          <>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {pointsInLevel} / {levelRange} points
              </span>
              <span className="font-medium text-primary">
                {pointsNeeded} to {nextThreshold.level}
              </span>
            </div>
          </>
        )}

        {isMaxLevel && (
          <div className="text-center py-2">
            <p className="text-sm font-medium text-primary">
              🎉 You've reached the highest level!
            </p>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3">How to earn points</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Make a recommendation</span>
              <span className="font-medium text-foreground">+5 pts</span>
            </div>
            <div className="flex justify-between">
              <span>Receive thumbs up</span>
              <span className="font-medium text-foreground">+5 pts</span>
            </div>
            <div className="flex justify-between">
              <span>Receive a comment</span>
              <span className="font-medium text-foreground">+5 pts</span>
            </div>
            <div className="flex justify-between">
              <span>Receive photos</span>
              <span className="font-medium text-foreground">+5 pts</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};