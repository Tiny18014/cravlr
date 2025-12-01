import { Badge } from '@/components/ui/badge';
import { Star, Award, Trophy, Crown, Sparkles } from 'lucide-react';

interface RecommenderLevelBadgeProps {
  level: string;
  points?: number;
  showPoints?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getLevelConfig = (level: string) => {
  switch (level) {
    case 'Verified Guru':
      return {
        icon: Crown,
        color: 'from-yellow-500 to-orange-500',
        textColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      };
    case 'Expert':
      return {
        icon: Trophy,
        color: 'from-purple-500 to-pink-500',
        textColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
      };
    case 'Trusted':
      return {
        icon: Award,
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    case 'Explorer':
      return {
        icon: Sparkles,
        color: 'from-green-500 to-emerald-500',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    default: // Newbie
      return {
        icon: Star,
        color: 'from-gray-400 to-gray-500',
        textColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
      };
  }
};

export const RecommenderLevelBadge = ({
  level,
  points,
  showPoints = false,
  size = 'md',
}: RecommenderLevelBadgeProps) => {
  const config = getLevelConfig(level);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      className={`${config.bgColor} ${config.textColor} border-0 font-semibold ${sizeClasses[size]} inline-flex items-center gap-1.5`}
    >
      <Icon className={iconSizes[size]} />
      <span>{level}</span>
      {showPoints && points !== undefined && (
        <span className="opacity-75">· {points} pts</span>
      )}
    </Badge>
  );
};