import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  TrendingUp, 
  BarChart3, 
  Star, 
  Zap,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';

interface PlanFeature {
  text: string;
  icon: any;
}

interface Plan {
  id: 'base' | 'growth';
  name: string;
  price: string;
  introPrice?: string;
  description: string;
  features: PlanFeature[];
  recommended?: boolean;
}

export default function SubscriptionSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'base' | 'growth' | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth-business');
      return;
    }
    fetchBusinessInfo();
  }, [user]);

  const fetchBusinessInfo = async () => {
    try {
      const { data: claims } = await supabase
        .from('business_claims')
        .select('restaurant_name, status')
        .eq('user_id', user?.id)
        .eq('status', 'verified')
        .maybeSingle();

      if (!claims) {
        navigate('/business/claim');
        return;
      }

      setBusinessName(claims.restaurant_name);
    } catch (error) {
      console.error('Error fetching business info:', error);
    }
  };

  const plans: Plan[] = [
    {
      id: 'base',
      name: 'Base Plan',
      price: '10% Commission',
      description: 'Pay only when customers visit. Perfect for small businesses just getting started.',
      features: [
        { text: 'Only pay per confirmed visit', icon: DollarSign },
        { text: 'No monthly fees', icon: CheckCircle },
        { text: 'Basic referral tracking', icon: BarChart3 },
        { text: 'Standard visibility', icon: Star }
      ]
    },
    {
      id: 'growth',
      name: 'Growth Tier',
      price: '$49/month',
      introPrice: '$29/month for first 3 months',
      description: 'Boost your visibility and grow faster with advanced features and priority placement.',
      recommended: true,
      features: [
        { text: 'Priority placement in recommendations', icon: TrendingUp },
        { text: 'Advanced analytics dashboard', icon: BarChart3 },
        { text: 'Featured listings & badges', icon: Star },
        { text: 'Higher visibility to food lovers', icon: Sparkles },
        { text: 'Early adopter pricing', icon: Zap }
      ]
    }
  ];

  const handleSelectPlan = async (planId: 'base' | 'growth') => {
    if (!user) return;

    setLoading(true);
    try {
      const isPremium = planId === 'growth';

      // Update business profile with plan selection
      const { error } = await supabase
        .from('business_profiles')
        .update({
          is_premium: isPremium,
          premium_started_at: isPremium ? new Date().toISOString() : null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Plan selected! 🎉',
        description: isPremium 
          ? 'Welcome to Growth Tier! Proceeding to payment setup...'
          : 'Base plan activated. You only pay commission on confirmed visits.',
      });

      // If growth tier, proceed to Stripe checkout
      if (isPremium) {
        // TODO: Integrate Stripe checkout
        setTimeout(() => {
          navigate('/business/dashboard');
        }, 2000);
      } else {
        navigate('/business/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-6xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verified Business
          </Badge>
          <h1 className="text-4xl font-bold mb-3">
            Welcome to Cravlr, {businessName}! 🎉
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose a plan that fits your growth goals. You can change it anytime.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`relative transition-all hover:shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-primary shadow-xl scale-[1.02]' 
                    : 'hover:scale-[1.01]'
                } ${
                  plan.recommended 
                    ? 'border-primary/50 bg-gradient-to-br from-card to-primary/5' 
                    : ''
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Recommended
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {plan.id === 'growth' && (
                      <TrendingUp className="h-6 w-6 text-primary" />
                    )}
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">{plan.price}</div>
                    {plan.introPrice && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <Clock className="mr-1 h-3 w-3" />
                          Early Adopter Special
                        </Badge>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {plan.introPrice}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      handleSelectPlan(plan.id);
                    }}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                    variant={isSelected ? 'default' : 'outline'}
                  >
                    {loading && selectedPlan === plan.id ? (
                      'Processing...'
                    ) : isSelected ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Selected
                      </>
                    ) : (
                      'Choose Plan'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Footer */}
        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">No long-term commitment</h3>
                <p className="text-sm text-muted-foreground">
                  You can upgrade, downgrade, or cancel your plan anytime from your dashboard. 
                  Switch between plans as your business grows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
