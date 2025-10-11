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
    <div className="max-w-5xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-6">
        Welcome to Cravlr, {profile?.business_name || 'Business Owner'}! 🍕
      </h1>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Clicks from Cravlr" value={totalStats.totalClicks.toString()} />
        <SummaryCard title="Customer Visits" value={totalStats.totalConversions.toString()} />
        <SummaryCard title="Payout Next Cycle" value={`$${totalStats.pendingCommission.toFixed(2)}`} />
        <SummaryCard title="Your Growth Stats" value={roi} />
      </div>

      {/* Smart Tips */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm">
            <span className="font-semibold">✨ Cravlr's Smart Tips:</span>{' '}
            {totalStats.totalClicks === 0 
              ? "Get started by claiming your restaurant to start receiving customer recommendations."
              : totalStats.totalConversions === 0
              ? "You have clicks but no conversions yet. Make sure to mark visits when customers arrive!"
              : `Great work! You're converting ${conversionRate}% of your referrals. ${isPremium ? "Premium features are boosting your visibility!" : "Consider upgrading to Premium for even more visibility."}`
            }
          </p>
          {!isPremium && (
            <Button variant="outline" className="mt-3" onClick={() => navigate('/business/subscription')}>
              Upgrade to Premium
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticsCard title="⚡ Conversion Power" value={`${conversionRate}%`} />
        <AnalyticsCard 
          title="📍 Top Location" 
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
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-2">⭐ Your Growth Tier Benefits</h2>
            <ul className="list-disc ml-5 text-sm">
              <li>Priority in customer recommendations</li>
              <li>Featured listing badge</li>
              <li>Smart suggestions powered by AI</li>
              <li>Advanced analytics dashboard</li>
              <li>Early adopter pricing ($29/month)</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <Tabs defaultValue="dashboard" className="mb-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
          <TabsTrigger value="attribution">🧭 Attribution</TabsTrigger>
          <TabsTrigger value="commissions">💵 Commissions</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">🔧 Quick Actions</h2>
              <div className="flex flex-col md:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate('/business/claim')}>
                  Claim Another Restaurant
                </Button>
                <Button variant="outline" onClick={() => navigate('/business/subscription')}>
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AdvancedAnalytics 
            isPremium={isPremium} 
            onUpgrade={() => navigate('/business/subscription')}
            clickData={clickData}
          />
        </TabsContent>

        <TabsContent value="attribution" className="mt-6">
          <div className="space-y-6">
            <SmartConversionSuggestions />
            <ReferralAttributionDashboard />
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <CommissionSummary userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            <PremiumUpgrade 
              isPremium={isPremium} 
              onUpgrade={() => navigate('/business/subscription')}
            />
            <CommissionSettings userId={user?.id || ''} />
          </div>
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
function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-xl font-semibold">{value}</p>
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
