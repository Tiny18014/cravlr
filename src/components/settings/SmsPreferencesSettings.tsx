import { useState } from "react";
import { Smartphone, Bell, MessageSquare, Clock, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSmsPreferences } from "@/hooks/useSmsPreferences";

export const SmsPreferencesSettings = () => {
  const { preferences, saving, updatePreference, updatePhoneNumber, hasPhoneNumber } = useSmsPreferences();
  const [phoneInput, setPhoneInput] = useState(preferences.phone_number || "");
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Sync phone input when preferences load
  if (preferences.phone_number && !phoneInput && !isEditingPhone) {
    setPhoneInput(preferences.phone_number);
  }

  const handleSavePhone = async () => {
    await updatePhoneNumber(phoneInput);
    setIsEditingPhone(false);
  };

  const smsSettings = [
    {
      key: 'sms_notifications_enabled' as const,
      icon: Smartphone,
      label: 'SMS Notifications',
      description: 'Master toggle for all SMS notifications',
    },
    {
      key: 'sms_new_requests' as const,
      icon: Bell,
      label: 'New Requests Nearby',
      description: 'Get SMS when someone requests food near you',
      disabled: !preferences.sms_notifications_enabled || !hasPhoneNumber,
    },
    {
      key: 'sms_recommendations' as const,
      icon: MessageSquare,
      label: 'New Recommendations',
      description: 'Get SMS when someone recommends a restaurant for you',
      disabled: !preferences.sms_notifications_enabled || !hasPhoneNumber,
    },
    {
      key: 'sms_visit_reminders' as const,
      icon: Clock,
      label: 'Visit Reminders',
      description: 'Get SMS reminders to share feedback after visiting',
      disabled: !preferences.sms_notifications_enabled || !hasPhoneNumber,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Phone Number Section */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Phone Number</Label>
        </div>
        
        {!hasPhoneNumber || isEditingPhone ? (
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={handleSavePhone}
              disabled={saving || !phoneInput}
            >
              Save
            </Button>
            {hasPhoneNumber && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  setPhoneInput(preferences.phone_number || "");
                  setIsEditingPhone(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{preferences.phone_number}</span>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setIsEditingPhone(true)}
            >
              Edit
            </Button>
          </div>
        )}
        
        {!hasPhoneNumber && (
          <p className="text-xs text-muted-foreground">
            Add a phone number to receive SMS notifications
          </p>
        )}
      </div>

      {/* SMS Toggles */}
      <div className="space-y-1">
        {smsSettings.map(({ key, icon: Icon, label, description, disabled }) => (
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
    </div>
  );
};