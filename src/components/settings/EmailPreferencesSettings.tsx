import { Mail, Bell, MessageSquare, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailPreferences } from "@/hooks/useEmailPreferences";

export const EmailPreferencesSettings = () => {
  const { preferences, loading, saving, updatePreference } = useEmailPreferences();

  // Show toggles immediately with defaults, no loading skeleton

  const emailSettings = [
    {
      key: 'email_notifications_enabled' as const,
      icon: Mail,
      label: 'Email Notifications',
      description: 'Master toggle for all email notifications',
    },
    {
      key: 'email_new_requests' as const,
      icon: Bell,
      label: 'New Requests Nearby',
      description: 'Get notified when someone requests food near you',
      disabled: !preferences.email_notifications_enabled,
    },
    {
      key: 'email_recommendations' as const,
      icon: MessageSquare,
      label: 'New Recommendations',
      description: 'Get notified when someone recommends a restaurant for you',
      disabled: !preferences.email_notifications_enabled,
    },
    {
      key: 'email_visit_reminders' as const,
      icon: Clock,
      label: 'Visit Reminders',
      description: 'Get reminded to share feedback after visiting a restaurant',
      disabled: !preferences.email_notifications_enabled,
    },
  ];

  return (
    <div className="space-y-1">
      {emailSettings.map(({ key, icon: Icon, label, description, disabled }) => (
        <div 
          key={key}
          className={`flex items-center justify-between py-4 border-b border-border/50 last:border-b-0 ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label 
                htmlFor={key} 
                className="text-sm font-medium cursor-pointer"
              >
                {label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <Switch
            id={key}
            checked={preferences[key]}
            onCheckedChange={(checked) => updatePreference(key, checked)}
            disabled={saving || disabled}
          />
        </div>
      ))}
    </div>
  );
};
