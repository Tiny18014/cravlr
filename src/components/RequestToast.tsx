import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RequestToastProps {
  request: {
    id: string;
    food_type: string;
    location_city: string;
    location_state: string;
    urgency: 'low' | 'medium' | 'high';
    distance_km?: number | null;
  };
  onDismiss: () => void;
}

export function RequestToast({ request, onDismiss }: RequestToastProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!user) return;

    try {
      // Store user state as accepted
      await supabase
        .from('request_user_state')
        .upsert({
          user_id: user.id,
          request_id: request.id,
          state: 'accepted'
        });

      // Navigate to recommend page
      navigate(`/recommend/${request.id}`);
      onDismiss();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept request',
        variant: 'destructive'
      });
    }
  };

  const handleIgnore = async () => {
    if (!user) return;

    try {
      // Store user state as ignored
      await supabase
        .from('request_user_state')
        .upsert({
          user_id: user.id,
          request_id: request.id,
          state: 'ignored'
        });

      onDismiss();
    } catch (error) {
      console.error('Error ignoring request:', error);
      toast({
        title: 'Error',
        description: 'Failed to ignore request',
        variant: 'destructive'
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  return (
    <Card className="p-4 mb-3 bg-background/95 backdrop-blur border-primary/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-sm">{request.food_type}</h3>
            <Badge className={getUrgencyColor(request.urgency)}>
              {request.urgency}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{request.location_city}, {request.location_state}</span>
            </div>
            {request.distance_km && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{request.distance_km.toFixed(1)} km away</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAccept}
              className="flex-1"
            >
              <Check className="h-3 w-3 mr-1" />
              Help Out
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleIgnore}
              className="flex-1"
            >
              <X className="h-3 w-3 mr-1" />
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}