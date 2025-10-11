import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'featured' | 'premium' | 'verified';
}

export function PremiumBadge({ 
  size = 'md', 
  showIcon = true,
  variant = 'featured' 
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const variants = {
    featured: {
      className: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0',
      label: 'Featured Partner',
      icon: '⭐'
    },
    premium: {
      className: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0',
      label: 'Premium',
      icon: '👑'
    },
    verified: {
      className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0',
      label: 'Verified Partner',
      icon: '✓'
    }
  };

  const config = variants[variant];

  return (
    <Badge className={`${config.className} ${sizeClasses[size]} font-medium`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
