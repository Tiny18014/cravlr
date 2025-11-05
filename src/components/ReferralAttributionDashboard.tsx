import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  MousePointer, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Users, 
  Eye,
  Smartphone,
  Monitor,
  Globe,
  Activity
} from 'lucide-react';
import { AdvancedAnalytics } from './AdvancedAnalytics';

interface ClickEvent {
  id: string;
  clicked_at: string;
  restaurant_name: string;
  place_id?: string;
  user_agent: string;
  ip_address: string;
  click_source: string;
  converted: boolean;
  conversion_value?: number;
  recommender_name?: string;
  requester_name?: string;
  device_type?: string;
  browser?: string;
  location_city?: string;
}

interface AttributionStats {
  total_clicks: number;
  unique_visitors: number;
  conversion_rate: number;
  average_order_value: number;
  top_sources: Array<{ source: string; count: number }>;
  device_breakdown: Array<{ device: string; count: number }>;
  hourly_patterns: Array<{ hour: number; clicks: number }>;
}

export default function ReferralAttributionDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [stats, setStats] = useState<AttributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPremiumStatus();
      fetchAttributionData();
      
      // Set up real-time subscription for new clicks
      const subscription = supabase
        .channel('referral_clicks')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'referral_clicks'
          },
          (payload) => {
            console.log('📊 New referral click received:', payload);
            fetchAttributionData(); // Refresh data when new click comes in
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, timeRange]);

  const fetchPremiumStatus = async () => {
    try {
      const { data } = await supabase
        .from('business_profiles')
        .select('is_premium')
        .eq('user_id', user?.id)
        .single();
      
      setIsPremium(data?.is_premium === true);
    } catch (error) {
      console.error('Error fetching premium status:', error);
    }
  };

  const fetchAttributionData = async () => {
    try {
      setLoading(true);
      
      // Get business claims for filtering
      const { data: claims } = await supabase
        .from('business_claims')
        .select('place_id, restaurant_name')
        .eq('user_id', user?.id)
        .eq('status', 'verified');

      if (!claims?.length) {
        setClicks([]);
        setStats(null);
        return;
      }

      // Calculate date range
      const now = new Date();
      const timeRanges = {
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };
      const since = timeRanges[timeRange as keyof typeof timeRanges];

      // Build filter for user's restaurants
      const restaurantFilter = claims.map(claim => {
        if (claim.place_id) {
          return `place_id.eq.${claim.place_id}`;
        }
        return `restaurant_name.ilike.%${claim.restaurant_name}%`;
      }).join(',');

      // Fetch recent clicks with enhanced data
      const { data: clicksData, error } = await supabase
        .from('referral_clicks')
        .select(`
          *,
          recommendations!referral_clicks_recommendation_id_fkey(
            recommender_id
          )
        `)
        .or(restaurantFilter)
        .gte('clicked_at', since.toISOString())
        .order('clicked_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enhance clicks with user names and device info
      const enhancedClicks = await Promise.all(
        (clicksData || []).map(async (click: any) => {
          // Fetch profiles separately to avoid deep type inference issues
          // @ts-expect-error - Known TypeScript limitation with deeply nested Supabase types
          const recommenderResult = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', click.recommender_id)
            .maybeSingle();
          
          const requesterResult = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', click.requester_id)
            .maybeSingle();

          const recommenderProfile = recommenderResult;
          const requesterProfile = requesterResult;

          // Parse user agent for device info
          const userAgent = click.user_agent || '';
          const device_type = getDeviceType(userAgent);
          const browser = getBrowser(userAgent);

          return {
            ...click,
            recommender_name: recommenderProfile.data?.display_name || 'Unknown',
            requester_name: requesterProfile.data?.display_name || 'Unknown',
            device_type,
            browser
          };
        })
      );

      // Calculate attribution statistics
      const attributionStats = calculateAttributionStats(enhancedClicks);
      
      setClicks(enhancedClicks);
      setStats(attributionStats);

    } catch (error) {
      console.error('Error fetching attribution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttributionStats = (clicks: any[]): AttributionStats => {
    const uniqueIPs = new Set(clicks.map(c => c.ip_address));
    const convertedClicks = clicks.filter(c => c.converted);
    const totalValue = convertedClicks.reduce((sum, c) => sum + (c.conversion_value || 0), 0);

    // Source breakdown
    const sourceCount: Record<string, number> = {};
    clicks.forEach(click => {
      sourceCount[click.click_source] = (sourceCount[click.click_source] || 0) + 1;
    });

    // Device breakdown
    const deviceCount: Record<string, number> = {};
    clicks.forEach(click => {
      const device = click.device_type || 'Unknown';
      deviceCount[device] = (deviceCount[device] || 0) + 1;
    });

    // Hourly patterns
    const hourlyCount = Array(24).fill(0);
    clicks.forEach(click => {
      const hour = new Date(click.clicked_at).getHours();
      hourlyCount[hour]++;
    });

    return {
      total_clicks: clicks.length,
      unique_visitors: uniqueIPs.size,
      conversion_rate: clicks.length > 0 ? (convertedClicks.length / clicks.length) * 100 : 0,
      average_order_value: convertedClicks.length > 0 ? totalValue / convertedClicks.length : 0,
      top_sources: Object.entries(sourceCount)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      device_breakdown: Object.entries(deviceCount)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count),
      hourly_patterns: hourlyCount.map((clicks, hour) => ({ hour, clicks }))
    };
  };

  const getDeviceType = (userAgent: string): string => {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile';
    if (/Tablet|iPad/.test(userAgent)) return 'Tablet';
    return 'Desktop';
  };

  const getBrowser = (userAgent: string): string => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile': return <Smartphone className="h-4 w-4" />;
      case 'Desktop': return <Monitor className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-64"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Digital Attribution Analytics
          </h2>
          <p className="text-muted-foreground">Real-time tracking and attribution analysis</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Attribution Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_clicks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unique_visitors} unique visitors
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversion_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.total_clicks - stats.total_clicks * (stats.conversion_rate / 100)))} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.average_order_value.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Per converted click
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.hourly_patterns.reduce((peak, hour, index) => 
                  hour.clicks > stats.hourly_patterns[peak].clicks ? index : peak, 0
                )}:00
              </div>
              <p className="text-xs text-muted-foreground">
                Most active time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
          <TabsTrigger value="devices">Device Analytics</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Click Events</CardTitle>
              <CardDescription>
                Live stream of referral link clicks and conversions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clicks.length > 0 ? (
                <div className="space-y-3">
                  {clicks.slice(0, 20).map((click) => (
                    <div key={click.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(click.device_type || 'Desktop')}
                        <div>
                          <p className="font-medium">{click.restaurant_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{click.requester_name}</span>
                            <span>•</span>
                            <span>{new Date(click.clicked_at).toLocaleTimeString()}</span>
                            <Badge variant="outline" className="ml-2">
                              {click.browser}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {click.converted ? (
                          <Badge variant="default" className="bg-green-500">
                            Converted ${click.conversion_value?.toFixed(2)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Pending
                          </Badge>
                        )}
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No click events in this time range</p>
                  <p className="text-sm text-muted-foreground">
                    Click data will appear here as customers interact with referral links
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>
                Where your referral clicks are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.top_sources.length ? (
                <div className="space-y-3">
                  {stats.top_sources.map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{source.source}</p>
                          <p className="text-sm text-muted-foreground">
                            {((source.count / stats.total_clicks) * 100).toFixed(1)}% of total traffic
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{source.count} clicks</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No traffic source data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device & Browser Analytics</CardTitle>
              <CardDescription>
                How customers are accessing your referral links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.device_breakdown.length ? (
                <div className="space-y-3">
                  {stats.device_breakdown.map((device, index) => (
                    <div key={device.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(device.device)}
                        <div>
                          <p className="font-medium">{device.device}</p>
                          <p className="text-sm text-muted-foreground">
                            {((device.count / stats.total_clicks) * 100).toFixed(1)}% of clicks
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{device.count} clicks</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No device data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <AdvancedAnalytics 
            isPremium={isPremium}
            onUpgrade={() => navigate('/business/subscription')}
            clickData={clicks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}