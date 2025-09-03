import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReputationBadgeProps {
  reputationScore: number;
  approvalRate: number;
  totalFeedbacks: number;
  className?: string;
  showDetails?: boolean;
}

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  reputationScore,
  approvalRate,
  totalFeedbacks,
  className,
  showDetails = false
}) => {
  const getReputationLevel = (score: number) => {
    if (score >= 95) return { label: 'Elite Foodie', color: 'bg-purple-600', icon: Award };
    if (score >= 80) return { label: 'Top Recommender', color: 'bg-yellow-500', icon: TrendingUp };
    if (score >= 0) return { label: 'Trusted', color: 'bg-green-600', icon: Star };
    return { label: 'Newbie', color: 'bg-gray-500', icon: Star };
  };

  const reputation = getReputationLevel(reputationScore);
  const Icon = reputation.icon;

  // Show Newbie badge when no reputation score exists or is null/undefined
  if ((reputationScore === null || reputationScore === undefined || reputationScore === 0) && totalFeedbacks < 3 && !showDetails) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant="secondary" 
          className="text-white border-0 flex items-center gap-1 bg-gray-500"
        >
          <Star className="h-3 w-3" />
          Newbie
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="secondary" 
        className={cn(
          "text-white border-0 flex items-center gap-1",
          reputation.color
        )}
      >
        <Icon className="h-3 w-3" />
        {reputation.label}
      </Badge>
      
      {showDetails && totalFeedbacks > 0 && (
        <div className="text-xs text-muted-foreground">
          {approvalRate.toFixed(0)}% positive ({totalFeedbacks} reviews)
        </div>
      )}
    </div>
  );
};