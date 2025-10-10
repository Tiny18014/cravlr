import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { useReferralConversions } from '@/hooks/useReferralConversions';
import ReferralAttributionDashboard from '@/components/ReferralAttributionDashboard';
import SmartConversionSuggestions from '@/components/SmartConversionSuggestions';
import { CommissionSettings } from '@/components/CommissionSettings';
import { CommissionSummary } from '@/components/CommissionSummary';
import { PremiumUpgrade } from '@/components/PremiumUpgrade';
import { Building2, TrendingUp, MousePointer, DollarSign, Clock, CheckCircle, XCircle, Users, LogOut, Activity } from 'lucide-react';

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { fetchBusinessClaims, getBusinessAnalytics } = useBusinessClaims();
  const { fetchPendingReferralClicks, markConversion, loading: conversionLoading } = useReferralConversions();
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [analytics, setAnalytics] = useState<BusinessAnalytics[]>([]);
  const [pendingClicks, setPendingClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClick, setSelectedClick] = useState<any>(null);
  const [conversionValue, setConversionValue] = useState('');
  const [conversionNotes, setConversionNotes] = useState('');

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
      const [claimsData, analyticsData, pendingClicksData] = await Promise.all([
        fetchBusinessClaims(user?.id),
        getBusinessAnalytics(user?.id),
        fetchPendingReferralClicks(user?.id)
      ]);
      
      setClaims(claimsData);
      setAnalytics(analyticsData);
      setPendingClicks(pendingClicksData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkConversion = async () => {
    if (!selectedClick || !conversionValue) return;

    const success = await markConversion(
      selectedClick.id,
      parseFloat(conversionValue),
      'business_verified',
      undefined, // visitDate - not captured in old form
      conversionNotes
    );

    if (success) {
      setSelectedClick(null);
      setConversionValue('');
      setConversionNotes('');
      // Refresh data
      fetchDashboardData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
    }
  };

  const totalStats = analytics.reduce(
    (acc, item) => ({
      clicks: acc.clicks + item.total_clicks,
      conversions: acc.conversions + item.conversions,
      totalCommission: acc.totalCommission + item.total_commission,
      paidCommission: acc.paidCommission + item.paid_commission,
      pendingCommission: acc.pendingCommission + item.pending_commission
    }),
    { clicks: 0, conversions: 0, totalCommission: 0, paidCommission: 0, pendingCommission: 0 }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary rounded w-64"></div>
            <div className="grid gap-6 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-secondary rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Business Dashboard</h1>
              <p className="text-muted-foreground">Track your restaurant's referral performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/how-it-works')} className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              How It Works
            </Button>
            <Button variant="outline" onClick={async () => {
              console.log('🔘 Sign out button clicked');
              try {
                await signOut();
                console.log('🔄 Navigating to welcome page...');
                navigate('/welcome');
              } catch (error) {
                console.error('❌ Sign out error in component:', error);
                // Force navigation even if sign out fails
                navigate('/welcome');
              }
            }} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Welcome Banner for New Users */}
        {claims.length === 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Welcome to Cravlr Business!</h2>
                  <p className="text-muted-foreground">
                    Get started by claiming your restaurant or learn more about how our referral system works.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/how-it-works')}>
                    Learn More
                  </Button>
                  <Button onClick={() => navigate('/business/claim')}>
                    Claim Restaurant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Leads</CardTitle>
              <MousePointer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalStats.clicks}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Referral link clicks from recommendations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Confirmed Visits</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">{totalStats.conversions}</div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {totalStats.clicks > 0 ? `${((totalStats.conversions / totalStats.clicks) * 100).toFixed(1)}%` : '0%'} conversion rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pending Payout</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">${totalStats.pendingCommission.toFixed(2)}</div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Awaiting next payment cycle
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total ROI</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">${totalStats.totalCommission.toFixed(2)}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                ${totalStats.paidCommission.toFixed(2)} paid out
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="attribution" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="attribution">Live Attribution</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
            <TabsTrigger value="conversions">Pending ({pendingClicks.length})</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="attribution" className="space-y-6">
            <SmartConversionSuggestions />
            <ReferralAttributionDashboard />
          </TabsContent>

          <TabsContent value="commission" className="space-y-6">
            <CommissionSummary userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <PremiumUpgrade 
              isPremium={false} 
              onUpgrade={() => {
                // TODO: Implement Stripe integration
                console.log('Upgrade to premium clicked');
              }} 
            />
            <CommissionSettings userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Performance</CardTitle>
                <CardDescription>
                  Detailed analytics for each of your verified restaurants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.map((restaurant, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">{restaurant.restaurant_name}</h3>
                        <div className="grid gap-4 md:grid-cols-5 text-sm">
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-medium">{restaurant.total_clicks}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversions</p>
                            <p className="font-medium">{restaurant.conversions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversion Rate</p>
                            <p className="font-medium">
                              {restaurant.total_clicks > 0 
                                ? `${((restaurant.conversions / restaurant.total_clicks) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pending</p>
                            <p className="font-medium">${restaurant.pending_commission.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Earned</p>
                            <p className="font-medium">${restaurant.total_commission.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No analytics available yet</p>
                    <p className="text-sm text-muted-foreground">
                      Once your restaurant claims are verified, you'll see performance data here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders</CardTitle>
                <CardDescription>
                  Mark orders as completed to award commissions and points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingClicks.length > 0 ? (
                  <div className="space-y-4">
                    {pendingClicks.map((click) => (
                      <div key={click.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h3 className="font-semibold">{click.restaurant_name}</h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Customer: {click.requester_name}</p>
                              <p>Recommended by: {click.recommender_name}</p>
                              <p>Clicked: {new Date(click.clicked_at).toLocaleDateString()} at {new Date(click.clicked_at).toLocaleTimeString()}</p>
                              <p>Commission Rate: {(click.commission_rate * 100)}%</p>
                            </div>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button onClick={() => setSelectedClick(click)}>
                                Mark as Completed
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Mark Order as Completed</DialogTitle>
                                <DialogDescription>
                                  Record the order details to award commission and points to the recommender.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="orderValue">Order Value ($)</Label>
                                  <Input
                                    id="orderValue"
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter the total order amount"
                                    value={conversionValue}
                                    onChange={(e) => setConversionValue(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="notes">Notes (optional)</Label>
                                  <Input
                                    id="notes"
                                    placeholder="Any additional notes about this order"
                                    value={conversionNotes}
                                    onChange={(e) => setConversionNotes(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedClick(null);
                                      setConversionValue('');
                                      setConversionNotes('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleMarkConversion}
                                    disabled={!conversionValue || conversionLoading}
                                  >
                                    {conversionLoading ? 'Processing...' : 'Mark Completed'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No pending orders</p>
                    <p className="text-sm text-muted-foreground">
                      Orders from Cravlr referrals will appear here for you to mark as completed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Claims</CardTitle>
                <CardDescription>
                  Manage your restaurant ownership claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                {claims.length > 0 ? (
                  <div className="space-y-4">
                    {claims.map((claim) => (
                      <div key={claim.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{claim.restaurant_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted {new Date(claim.created_at).toLocaleDateString()}
                            </p>
                            {claim.verified_at && (
                              <p className="text-sm text-muted-foreground">
                                Verified {new Date(claim.verified_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(claim.status)}
                            <Badge className={getStatusColor(claim.status)}>
                              {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        {claim.verification_notes && (
                          <div className="mt-3 p-3 bg-secondary/50 rounded">
                            <p className="text-sm">
                              <strong>Note:</strong> {claim.verification_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No restaurant claims yet</p>
                    <Button onClick={() => window.location.href = '/business/claim'}>
                      Claim Your First Restaurant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}