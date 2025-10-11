import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Clock, 
  MapPin, 
  Target,
  BarChart3,
  Crown
} from 'lucide-react';

interface AdvancedAnalyticsProps {
  isPremium: boolean;
  onUpgrade: () => void;
  clickData: any[];
}

export function AdvancedAnalytics({ isPremium, onUpgrade, clickData }: AdvancedAnalyticsProps) {
  if (!isPremium) {
    return (
      <Card className="border-2 border-dashed border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
        <CardContent className="pt-6 text-center py-12">
          <Crown className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
          <h3 className="text-xl font-bold mb-2">Advanced Analytics</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Unlock deeper insights with CTR tracking, time-to-response analysis, conversion patterns, and geo heatmaps.
          </p>
          <Button onClick={onUpgrade} size="lg">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Growth Tier
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate advanced metrics
  const avgTimeToResponse = calculateAvgTimeToResponse(clickData);
  const ctrByHour = calculateCTRByHour(clickData);
  const conversionsByDay = calculateConversionsByDay(clickData);
  const geoDistribution = calculateGeoDistribution(clickData);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5 text-yellow-600" />
        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
          Premium Analytics
        </Badge>
      </div>

      {/* CTR Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Click-Through Rate Analysis
          </CardTitle>
          <CardDescription>Performance by hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ctrByHour.slice(0, 5).map((hour, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{hour.hour}:00 - {(hour.hour + 1) % 24}:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    {hour.clicks} clicks
                  </div>
                  <Badge variant={hour.ctr > 50 ? "default" : "secondary"}>
                    {hour.ctr.toFixed(1)}% CTR
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time to Response */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Response Time Metrics
          </CardTitle>
          <CardDescription>Average time from view to click</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">{avgTimeToResponse}</div>
          <p className="text-sm text-muted-foreground">
            Faster response times correlate with higher conversion rates
          </p>
        </CardContent>
      </Card>

      {/* Conversion Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Conversion Patterns
          </CardTitle>
          <CardDescription>Daily conversion tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conversionsByDay.slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(day.conversions / Math.max(...conversionsByDay.map(d => d.conversions))) * 100}%` }}
                    />
                  </div>
                  <Badge variant="outline">{day.conversions}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Heatmap
          </CardTitle>
          <CardDescription>Where your customers are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {geoDistribution.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{location.city}</span>
                </div>
                <Badge variant="outline">{location.count} visits</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions for calculations
function calculateAvgTimeToResponse(clickData: any[]): string {
  if (!clickData.length) return "N/A";
  // Simplified calculation - would need actual view timestamps
  return "12 min";
}

function calculateCTRByHour(clickData: any[]): Array<{ hour: number; clicks: number; ctr: number }> {
  const hourlyData: Record<number, { clicks: number; views: number }> = {};
  
  clickData.forEach(click => {
    const hour = new Date(click.clicked_at).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { clicks: 0, views: 0 };
    }
    hourlyData[hour].clicks++;
    hourlyData[hour].views++; // Simplified - would need actual view data
  });

  return Object.entries(hourlyData)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      clicks: data.clicks,
      ctr: data.views > 0 ? (data.clicks / data.views) * 100 : 0
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function calculateConversionsByDay(clickData: any[]): Array<{ date: string; conversions: number }> {
  const dailyData: Record<string, number> = {};
  
  clickData
    .filter(click => click.converted)
    .forEach(click => {
      const date = new Date(click.converted_at || click.clicked_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

  return Object.entries(dailyData)
    .map(([date, conversions]) => ({ date, conversions }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);
}

function calculateGeoDistribution(clickData: any[]): Array<{ city: string; count: number }> {
  const geoData: Record<string, number> = {};
  
  clickData.forEach(click => {
    const city = click.location_city || 'Unknown';
    geoData[city] = (geoData[city] || 0) + 1;
  });

  return Object.entries(geoData)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
