/**
 * Isolated Do Not Disturb toggle component
 * This replaces the existing DoNotDisturbToggle with the new system
 */
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRequestNotifications } from '@/hooks/useRequestNotifications';

export const IsolatedDNDToggle: React.FC = () => {
  const { dndEnabled, updateDndSetting } = useRequestNotifications();

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="dnd-mode"
        checked={dndEnabled}
        onCheckedChange={updateDndSetting}
      />
      <Label htmlFor="dnd-mode" className="text-sm">
        Do Not Disturb
      </Label>
    </div>
  );
};