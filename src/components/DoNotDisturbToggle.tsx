import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DoNotDisturbToggleProps {
  notifyRecommender: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DoNotDisturbToggle({ notifyRecommender, onToggle }: DoNotDisturbToggleProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleToggle = async (enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notify_recommender: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      onToggle(enabled);
      
      toast({
        title: enabled ? 'Notifications enabled' : 'Do Not Disturb enabled',
        description: enabled 
          ? 'You\'ll receive notifications for new food requests' 
          : 'You won\'t receive notifications until you turn this back on'
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preference',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {notifyRecommender ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
      <Switch
        id="notify-recommender"
        checked={notifyRecommender}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="notify-recommender" className="text-sm font-medium">
        {notifyRecommender ? 'Notifications' : 'Do Not Disturb'}
      </Label>
    </div>
  );
}