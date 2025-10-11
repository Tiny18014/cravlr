import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { useReferralConversions } from '@/hooks/useReferralConversions';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import ReferralAttributionDashboard from '@/components/ReferralAttributionDashboard';
import SmartConversionSuggestions from '@/components/SmartConversionSuggestions';
import { CommissionSettings } from '@/components/CommissionSettings';
import { CommissionSummary } from '@/components/CommissionSummary';
import { PremiumUpgrade } from '@/components/PremiumUpgrade';
import { AdvancedAnalytics } from '@/components/AdvancedAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, LineChart, MapPin, Star, Sparkles } from 'lucide-react';

interface BusinessClaim {
  id: string;
  restaurant_name: string;
  status: string;
  created_at: string;
  verified_at?: string;
  verification_notes?: string;
}

interface BusinessAnalytics {
  restaurant_name: string;
  total_clicks: number;
  conversions: number;
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchBusinessClaims, getBusinessAnalytics } = useBusinessClaims();
  const { fetchPendingReferralClicks } = useReferralConversions();
  const { profile, isPremium, loading: profileLoading } = useBusinessProfile();
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [analytics, setAnalytics] = useState<BusinessAnalytics[]>([]);
  const [pendingClicks, setPendingClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickData, setClickData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchDashboardData();
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Check subscription status
      const { data: bizProfile } = await supabase
        .from('business_profiles')
        .select('is_premium')
        .eq('user_id', user?.id)
        .maybeSingle();

      // If no subscription selected yet, redirect to subscription page
      if (bizProfile && bizProfile.is_premium === null) {
        navigate('/business/subscription');
        return;
      }

      const [claimsData, analyticsData, pendingClicksData, clicksData] = await Promise.all([
        fetchBusinessClaims(user?.id),
        getBusinessAnalytics(user?.id),
        fetchPendingReferralClicks(user?.id),
        fetchClickData()
      ]);
      
      setClaims(claimsData);
      setAnalytics(analyticsData);
      setPendingClicks(pendingClicksData);
      setClickData(clicksData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClickData = async () => {
    const { data } = await supabase
      .from('referral_clicks')
      .select('*')
      .eq('recommender_id', user?.id)
      .order('clicked_at', { ascending: false });
    return data || [];
  };

  const totalStats = analytics.reduce(
    (acc, curr) => ({
      totalClicks: acc.totalClicks + Number(curr.total_clicks),
      totalConversions: acc.totalConversions + Number(curr.conversions),
      totalCommission: acc.totalCommission + Number(curr.total_commission),
      pendingCommission: acc.pendingCommission + Number(curr.pending_commission),
    }),
    { totalClicks: 0, totalConversions: 0, totalCommission: 0, pendingCommission: 0 }
  );

  const conversionRate = totalStats.totalClicks > 0 
    ? ((totalStats.totalConversions / totalStats.totalClicks) * 100).toFixed(1)
    : '0';

  const roi = totalStats.totalCommission > 0 
    ? `$${totalStats.totalCommission.toFixed(2)} ROI`
    : '$0.00 ROI';

  if (loading || profileLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-8 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Welcome to Cravlr, {profile?.business_name || 'Business Owner'}! 🍕
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/business/claim')}>
            Claim Restaurant
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
            Profile
          </Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard 
          title="Clicks from Cravlr" 
          value={totalStats.totalClicks.toString()} 
          icon={<MapPin />} 
        />
        <SummaryCard 
          title="Customer Visits" 
          value={totalStats.totalConversions.toString()} 
          icon={<CheckCircle />} 
        />
        <SummaryCard 
          title="Payout Next Cycle" 
          value={`$${totalStats.pendingCommission.toFixed(2)}`} 
          icon={<Star />} 
        />
        <SummaryCard 
          title="Your Growth Stats" 
          value={roi} 
          icon={<LineChart />} 
        />
      </div>

      {/* Smart Tips */}
      <Card className="bg-muted">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Cravlr's Smart Tips
          </h2>
          <p className="text-muted-foreground">
            {totalStats.totalClicks === 0 
              ? "Get started by claiming your restaurant to start receiving customer recommendations."
              : totalStats.totalConversions === 0
              ? "You have clicks but no conversions yet. Make sure to mark visits when customers arrive!"
              : `Great work! You're converting ${conversionRate}% of your referrals. ${isPremium ? "Premium features are boosting your visibility!" : "Consider upgrading to Premium for even more visibility."}`
            }
          </p>
          {!isPremium && (
            <Button variant="outline" onClick={() => navigate('/business/subscription')}>
              Upgrade to Premium
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Analytics Snapshots */}
      <div className="grid md:grid-cols-3 gap-4">
        <AnalyticsCard title="⚡ Conversion Power" value={`${conversionRate}%`} />
        <AnalyticsCard 
          title="🌍 Top Location" 
          value={claims[0]?.restaurant_name ? claims[0].restaurant_name.split(',')[0] : 'N/A'} 
        />
        <AnalyticsCard 
          title="💰 Avg Commission" 
          value={totalStats.totalConversions > 0 
            ? `$${(totalStats.totalCommission / totalStats.totalConversions).toFixed(2)}`
            : '$0.00'
          } 
        />
      </div>

      {/* Growth Tier Benefits */}
      {isPremium && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">⭐ Your Growth Tier Benefits</h2>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Priority in customer recommendations</li>
              <li>Featured listing badge</li>
              <li>Smart suggestions powered by AI</li>
              <li>Advanced analytics dashboard</li>
              <li>Early adopter pricing ($29/month)</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">🏠 Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
          <TabsTrigger value="attribution">🔗 Attribution</TabsTrigger>
          <TabsTrigger value="commissions">💰 Commissions</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and management tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate('/business/claim')}>
                Claim Another Restaurant
              </Button>
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate('/business/subscription')}>
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdvancedAnalytics 
            isPremium={isPremium} 
            onUpgrade={() => navigate('/business/subscription')}
            clickData={clickData}
          />
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6">
          <SmartConversionSuggestions />
          <ReferralAttributionDashboard />
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <CommissionSummary userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <PremiumUpgrade 
            isPremium={isPremium} 
            onUpgrade={() => navigate('/business/subscription')}
          />
          <CommissionSettings userId={user?.id || ''} />
        </TabsContent>
      </Tabs>

      {/* Help Prompt */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        Need help understanding your dashboard?{' '}
        <span className="text-primary underline cursor-pointer" onClick={() => navigate('/profile')}>
          Contact Support
        </span>
      </div>
    </div>
  );
}

// Helper Components
function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start p-4 space-y-2">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function AnalyticsCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
