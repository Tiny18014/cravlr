import React from 'react';
import { Bell, Mail, Smartphone, MessageSquare, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingsSection } from './SettingsSection';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import { useSmsPreferences } from '@/hooks/useSmsPreferences';
import { FormField, FormItem } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface UnifiedNotificationsSettingsProps {
  form: UseFormReturn<any>;
}

export const UnifiedNotificationsSettings = ({ form }: UnifiedNotificationsSettingsProps) => {
  const { preferences: emailPrefs, saving: emailSaving, updatePreference: updateEmailPref } = useEmailPreferences();
  const { preferences: smsPrefs, saving: smsSaving, updatePreference: updateSmsPref, hasPhoneNumber } = useSmsPreferences();

  return (
    <SettingsSection title="Notifications" icon={Bell}>
      {/* Push Notifications */}
      <div className="pb-4 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bell className="h-3.5 w-3.5 text-primary" />
          </div>
          Push Notifications
        </h4>
        <FormField
          control={form.control}
          name="notify_recommender"
          render={({ field }) => (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium cursor-pointer">
                  New Requests Nearby
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when food requests are posted in your area
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
      </div>

      {/* SMS Notifications */}
      <div className="py-4 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
          </div>
          SMS Notifications
          {!hasPhoneNumber && (
            <span className="text-xs text-muted-foreground ml-2">(Add phone in Edit Profile)</span>
          )}
        </h4>
        
        <div className={`space-y-2 ${!hasPhoneNumber ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                SMS Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Master toggle for all SMS notifications
              </p>
            </div>
            <Switch
              checked={smsPrefs.sms_notifications_enabled}
              onCheckedChange={(checked) => updateSmsPref('sms_notifications_enabled', checked)}
              disabled={smsSaving || !hasPhoneNumber}
            />
          </div>
          
          <div className={`flex items-center justify-between py-2 ${!smsPrefs.sms_notifications_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                New Requests
              </Label>
              <p className="text-xs text-muted-foreground">
                SMS for new food requests nearby
              </p>
            </div>
            <Switch
              checked={smsPrefs.sms_new_requests}
              onCheckedChange={(checked) => updateSmsPref('sms_new_requests', checked)}
              disabled={smsSaving || !hasPhoneNumber || !smsPrefs.sms_notifications_enabled}
            />
          </div>
          
          <div className={`flex items-center justify-between py-2 ${!smsPrefs.sms_notifications_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                New Recommendations
              </Label>
              <p className="text-xs text-muted-foreground">
                SMS when someone recommends for you
              </p>
            </div>
            <Switch
              checked={smsPrefs.sms_recommendations}
              onCheckedChange={(checked) => updateSmsPref('sms_recommendations', checked)}
              disabled={smsSaving || !hasPhoneNumber || !smsPrefs.sms_notifications_enabled}
            />
          </div>
          
          <div className={`flex items-center justify-between py-2 ${!smsPrefs.sms_notifications_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                Visit Reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                SMS reminders to share feedback
              </p>
            </div>
            <Switch
              checked={smsPrefs.sms_visit_reminders}
              onCheckedChange={(checked) => updateSmsPref('sms_visit_reminders', checked)}
              disabled={smsSaving || !hasPhoneNumber || !smsPrefs.sms_notifications_enabled}
            />
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Mail className="h-3.5 w-3.5 text-primary" />
          </div>
          Email Notifications
        </h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                Email Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Master toggle for all email notifications
              </p>
            </div>
            <Switch
              checked={emailPrefs.email_notifications_enabled}
              onCheckedChange={(checked) => updateEmailPref('email_notifications_enabled', checked)}
              disabled={emailSaving}
            />
          </div>
          
          <div className={`flex items-center justify-between py-2 ${!emailPrefs.email_notifications_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                New Requests
              </Label>
              <p className="text-xs text-muted-foreground">
                Email for new food requests nearby
              </p>
            </div>
            <Switch
              checked={emailPrefs.email_new_requests}
              onCheckedChange={(checked) => updateEmailPref('email_new_requests', checked)}
              disabled={emailSaving || !emailPrefs.email_notifications_enabled}
            />
          </div>
          
          <div className={`flex items-center justify-between py-2 ${!emailPrefs.email_notifications_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                New Recommendations
              </Label>
              <p className="text-xs text-muted-foreground">
                Email when someone recommends for you
              </p>
            </div>
            <Switch
              checked={emailPrefs.email_recommendations}
              onCheckedChange={(checked) => updateEmailPref('email_recommendations', checked)}
              disabled={emailSaving || !emailPrefs.email_notifications_enabled}
            />
          </div>
          
          <div className={`flex items-center justify-between py-2 ${!emailPrefs.email_notifications_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                Visit Reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Email reminders to share feedback
              </p>
            </div>
            <Switch
              checked={emailPrefs.email_visit_reminders}
              onCheckedChange={(checked) => updateEmailPref('email_visit_reminders', checked)}
              disabled={emailSaving || !emailPrefs.email_notifications_enabled}
            />
          </div>
        </div>
      </div>
    </SettingsSection>
  );
};
