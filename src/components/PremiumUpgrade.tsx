import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, TrendingUp, Star, Zap, CheckCircle } from 'lucide-react';

interface PremiumUpgradeProps {
  isPremium: boolean;
  onUpgrade: () => void;
}

export function PremiumUpgrade({ isPremium, onUpgrade }: PremiumUpgradeProps) {
  if (isPremium) {
    return (
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div>
                <Badge className="mb-2 bg-yellow-600">Premium</Badge>
                <p className="font-semibold text-lg">You're a Premium Business</p>
                <p className="text-sm text-muted-foreground">
                  Enjoying all premium features
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Manage Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const features = [
    {
      icon: Star,
      title: 'Priority Display',
      description: 'Get featured first in recommendations'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Deep insights into conversion patterns'
    },
    {
      icon: Zap,
      title: 'Featured Badge',
      description: 'Stand out with a premium badge'
    },
    {
      icon: CheckCircle,
      title: 'Seasonal Campaigns',
      description: 'Access to exclusive promotional opportunities'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-600" />
          Upgrade to Premium
        </CardTitle>
        <CardDescription>
          Unlock powerful features to grow your business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-4">
          <div className="inline-flex items-baseline">
            <span className="text-4xl font-bold">$25</span>
            <span className="text-muted-foreground ml-2">/month per location</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex gap-3">
                <div className="mt-1">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={onUpgrade} className="w-full" size="lg">
          <Crown className="mr-2 h-4 w-4" />
          Upgrade Now
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime. No long-term commitment required.
        </p>
      </CardContent>
    </Card>
  );
}
