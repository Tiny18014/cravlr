import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useToast } from '@/hooks/use-toast';

interface DoNotDisturbToggleProps {
  notifyRecommender: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DoNotDisturbToggle({ notifyRecommender, onToggle }: DoNotDisturbToggleProps) {
  const { dnd, setDnd } = useNotifications();
  const { toast } = useToast();

  const handleToggle = async (enabled: boolean) => {
    try {
      // Use the notifications context to update DND state globally
      await setDnd(!enabled); // DND is opposite of notify_recommender
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
      {!dnd ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
      <Switch
        id="notify-recommender"
        checked={!dnd}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="notify-recommender" className="text-sm font-medium">
        {!dnd ? 'Notifications' : 'Do Not Disturb'}
      </Label>
    </div>
  );
}