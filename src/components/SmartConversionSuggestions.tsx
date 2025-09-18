import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ConversionPredictor from '@/components/ConversionPredictor';
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp,
  Bell,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

interface SmartSuggestion {
  id: string;
  click_id: string;
  restaurant_name: string;
  requester_name: string;
  probability: number;
  signals: any;
  recommendation: string;
  clicked_at: string;
}

export default function SmartConversionSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
      
      // Auto-refresh every 5 minutes
      const interval = setInterval(fetchSuggestions, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      
      // Get business claims for filtering
      const { data: claims } = await supabase
        .from('business_claims')
        .select('place_id, restaurant_name')
        .eq('user_id', user?.id)
        .eq('status', 'verified');

      if (!claims?.length) {
        setSuggestions([]);
        return;
      }

      // Get high-probability clicks for user's restaurants
      const restaurantFilter = claims.map(claim => {
        if (claim.place_id) {
          return `place_id.eq.${claim.place_id}`;
        }
        return `restaurant_name.ilike.%${claim.restaurant_name}%`;
      }).join(',');

      const { data: highProbClicks, error } = await supabase
        .from('referral_clicks')
        .select(`
          *
        `)
        .or(restaurantFilter)
        .eq('converted', false)
        .gte('conversion_probability', 0.75)
        .gte('clicked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('conversion_probability', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get user names for display
      const enrichedSuggestions = await Promise.all(
        (highProbClicks || []).map(async (click: any) => {
          const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', click.requester_id)
            .maybeSingle();

          return {
            id: click.id,
            click_id: click.id,
            restaurant_name: click.restaurant_name,
            requester_name: requesterProfile?.display_name || 'Unknown',
            probability: click.conversion_probability || 0.75,
            signals: click.conversion_signals ? JSON.parse(click.conversion_signals) : {},
            recommendation: getRecommendation(click.conversion_probability || 0.75),
            clicked_at: click.clicked_at
          };
        })
      );

      setSuggestions(enrichedSuggestions);

    } catch (error) {
      console.error('Error fetching conversion suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSmartDetection = async () => {
    try {
      setRunning(true);
      
      const { data, error } = await supabase.functions.invoke('smart-conversion-detection');
      
      if (error) {
        throw error;
      }
      
      console.log('🤖 Smart detection completed:', data);
      
      // Refresh suggestions after running detection
      await fetchSuggestions();
      
    } catch (error) {
      console.error('❌ Smart detection failed:', error);
    } finally {
      setRunning(false);
    }
  };

  const getRecommendation = (probability: number): string => {
    if (probability > 0.9) return 'Contact immediately - very high conversion likelihood';
    if (probability > 0.8) return 'Send personalized follow-up within 24 hours';
    if (probability > 0.6) return 'Add to priority follow-up list';
    return 'Monitor for additional signals';
  };

  const getProbabilityColor = (probability: number) => {
    if (probability > 0.9) return 'bg-red-500';
    if (probability > 0.8) return 'bg-orange-500';
    if (probability > 0.7) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getPriorityIcon = (probability: number) => {
    if (probability > 0.9) return <Zap className="h-4 w-4 text-red-600" />;
    if (probability > 0.8) return <Target className="h-4 w-4 text-orange-600" />;
    return <TrendingUp className="h-4 w-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-64"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-secondary rounded"></div>
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
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Smart Conversion Intelligence
          </h3>
          <p className="text-muted-foreground text-sm">
            AI-powered suggestions for high-probability conversions
          </p>
        </div>
        <Button 
          onClick={runSmartDetection} 
          disabled={running}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          {running ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getPriorityIcon(suggestion.probability)}
                      {suggestion.restaurant_name}
                    </CardTitle>
                    <CardDescription>
                      Customer: {suggestion.requester_name} • 
                      Clicked {new Date(suggestion.clicked_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getProbabilityColor(suggestion.probability)}`}></div>
                    <Badge variant="secondary">
                      {(suggestion.probability * 100).toFixed(0)}% likely
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">AI Recommendation</p>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.recommendation}
                    </p>
                  </div>
                  <Button size="sm" className="ml-4">
                    Take Action
                  </Button>
                </div>

                {/* Conversion Signals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {suggestion.signals.recent_click && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Clock className="h-3 w-3" />
                      Recent activity
                    </div>
                  )}
                  {suggestion.signals.meal_time_click && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Zap className="h-3 w-3" />
                      Meal time
                    </div>
                  )}
                  {suggestion.signals.mobile_user && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Users className="h-3 w-3" />
                      Mobile user
                    </div>
                  )}
                  {suggestion.signals.multiple_interactions && (
                    <div className="flex items-center gap-1 text-purple-600">
                      <Bell className="h-3 w-3" />
                      Multiple clicks
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No High-Priority Conversions</h3>
            <p className="text-muted-foreground mb-4">
              No high-probability conversion candidates found at this time.
            </p>
            <Button onClick={runSmartDetection} variant="outline" disabled={running}>
              <Brain className="h-4 w-4 mr-2" />
              Run Smart Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Educational Note */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                How Smart Detection Works
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Our AI analyzes click patterns, timing, device usage, and behavioral signals 
                to predict which referral clicks are most likely to convert into actual visits. 
                Focus your follow-up efforts on the highest-probability opportunities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}