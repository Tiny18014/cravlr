import React from 'react';
import { Bell, Mail, Smartphone, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingsSection } from './SettingsSection';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import { useSmsPreferences } from '@/hooks/useSmsPreferences';
import { FormField } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface UnifiedNotificationsSettingsProps {
  form: UseFormReturn<any>;
}

export const UnifiedNotificationsSettings = ({ form }: UnifiedNotificationsSettingsProps) => {
  const { preferences: emailPrefs, saving: emailSaving, updatePreference: updateEmailPref } = useEmailPreferences();
  const { preferences: smsPrefs, saving: smsSaving, updatePreference: updateSmsPref, hasPhoneNumber } = useSmsPreferences();

  return (
    <SettingsSection title="Notifications" icon={Bell}>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {/* Push Notifications */}
        <AccordionItem value="push" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">In-app and device alerts</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              <FormField
                control={form.control}
                name="notify_recommender"
                render={({ field }) => (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
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
          </AccordionContent>
        </AccordionItem>

        {/* SMS Notifications */}
        <AccordionItem value="sms" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {hasPhoneNumber ? 'Text message alerts' : 'Add phone in Edit Profile'}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className={`space-y-3 pt-2 ${!hasPhoneNumber ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium cursor-pointer">
                    SMS Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Master toggle for all SMS
                  </p>
                </div>
                <Switch
                  checked={smsPrefs.sms_notifications_enabled}
                  onCheckedChange={(checked) => updateSmsPref('sms_notifications_enabled', checked)}
                  disabled={smsSaving || !hasPhoneNumber}
                />
              </div>
              
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 ${!smsPrefs.sms_notifications_enabled ? 'opacity-50' : ''}`}>
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
              
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 ${!smsPrefs.sms_notifications_enabled ? 'opacity-50' : ''}`}>
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
              
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 ${!smsPrefs.sms_notifications_enabled ? 'opacity-50' : ''}`}>
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
          </AccordionContent>
        </AccordionItem>

        {/* Email Notifications */}
        <AccordionItem value="email" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Email alerts and updates</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium cursor-pointer">
                    Email Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Master toggle for all emails
                  </p>
                </div>
                <Switch
                  checked={emailPrefs.email_notifications_enabled}
                  onCheckedChange={(checked) => updateEmailPref('email_notifications_enabled', checked)}
                  disabled={emailSaving}
                />
              </div>
              
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 ${!emailPrefs.email_notifications_enabled ? 'opacity-50' : ''}`}>
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
              
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 ${!emailPrefs.email_notifications_enabled ? 'opacity-50' : ''}`}>
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
              
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 ${!emailPrefs.email_notifications_enabled ? 'opacity-50' : ''}`}>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SettingsSection>
  );
};
