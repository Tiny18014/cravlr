/**
 * Integrated DND Toggle for Profile page
 * This component uses the unified notification system
 */
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { FormControl, FormDescription, FormItem, FormLabel } from '@/components/ui/form';
import { useRequestNotifications } from '@/hooks/useRequestNotifications';

export const ProfileDNDToggle: React.FC = () => {
  const { dndEnabled, updateDndSetting } = useRequestNotifications();

  return (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">
          Do Not Disturb
        </FormLabel>
        <FormDescription>
          Temporarily pause all food request notifications.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={dndEnabled}
          onCheckedChange={updateDndSetting}
        />
      </FormControl>
    </FormItem>
  );
};