import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEnhancedAttribution } from '@/hooks/useEnhancedAttribution';
import { 
  TrendingUp, 
  Clock, 
  Smartphone, 
  Monitor, 
  Globe, 
  Target,
  Brain,
  Zap
} from 'lucide-react';

interface ConversionPredictorProps {
  referralCode: string;
  restaurantName: string;
  className?: string;
}

export default function ConversionPredictor({ 
  referralCode, 
  restaurantName, 
  className 
}: ConversionPredictorProps) {
  const { predictConversion, getAttributionInsights } = useEnhancedAttribution();
  const [conversionProbability, setConversionProbability] = useState<number>(0);
  const [insights, setInsights] = useState<any>({});
  const [predictionLevel, setPredictionLevel] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const probability = predictConversion(referralCode);
    const attributionInsights = getAttributionInsights();
    
    setConversionProbability(probability);
    setInsights(attributionInsights);
    
    // Categorize prediction level
    if (probability >= 0.7) setPredictionLevel('high');
    else if (probability >= 0.5) setPredictionLevel('medium');
    else setPredictionLevel('low');
  }, [referralCode, predictConversion, getAttributionInsights]);

  const getPredictionColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPredictionIcon = (level: string) => {
    switch (level) {
      case 'high': return <Target className="h-4 w-4 text-green-600" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      default: return <Brain className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    return deviceType === 'mobile' ? 
      <Smartphone className="h-4 w-4" /> : 
      <Monitor className="h-4 w-4" />;
  };

  return (
    <Card className={`${className} ${getPredictionColor(predictionLevel)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Conversion Intelligence
          </CardTitle>
          {getPredictionIcon(predictionLevel)}
        </div>
        <CardDescription>
          AI-powered likelihood analysis for {restaurantName}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Prediction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Conversion Probability</span>
            <Badge variant={predictionLevel === 'high' ? 'default' : 'secondary'}>
              {(conversionProbability * 100).toFixed(0)}%
            </Badge>
          </div>
          <Progress 
            value={conversionProbability * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {predictionLevel === 'high' && '🎯 High likelihood of visit'}
            {predictionLevel === 'medium' && '📊 Moderate interest detected'}
            {predictionLevel === 'low' && '🔍 Early interest stage'}
          </p>
        </div>

        {/* Attribution Signals */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Attribution Signals
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Device & Context */}
            <div className="flex items-center gap-2">
              {getDeviceIcon(insights.device_type)}
              <span className="capitalize">{insights.device_type}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>{insights.local_time}</span>
            </div>

            {/* Behavioral Signals */}
            {insights.is_meal_time && (
              <div className="flex items-center gap-2 text-green-600">
                <Zap className="h-3 w-3" />
                <span>Meal time</span>
              </div>
            )}
            
            {insights.is_weekend && (
              <div className="flex items-center gap-2 text-blue-600">
                <Globe className="h-3 w-3" />
                <span>Weekend</span>
              </div>
            )}
          </div>
          
          {/* Session Info */}
          <div className="pt-2 border-t border-current/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Session</span>
              <span className="font-mono">{insights.session_id?.slice(-8)}</span>
            </div>
          </div>
        </div>
        
        {/* Prediction Explanation */}
        <div className="pt-2 border-t border-current/20">
          <p className="text-xs text-muted-foreground">
            {predictionLevel === 'high' && 
              'Multiple positive signals indicate strong visit intent. Consider priority follow-up.'}
            {predictionLevel === 'medium' && 
              'Moderate engagement signals. Good candidate for gentle follow-up.'}
            {predictionLevel === 'low' && 
              'Early stage interest. Track for pattern development.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}