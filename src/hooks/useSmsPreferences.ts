import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SmsPreferences {
  sms_notifications_enabled: boolean;
  sms_new_requests: boolean;
  sms_recommendations: boolean;
  sms_visit_reminders: boolean;
  phone_number: string | null;
}

const defaultPreferences: SmsPreferences = {
  sms_notifications_enabled: true,
  sms_new_requests: true,
  sms_recommendations: true,
  sms_visit_reminders: true,
  phone_number: null,
};

export function useSmsPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<SmsPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('sms_notifications_enabled, sms_new_requests, sms_recommendations, sms_visit_reminders, phone_number')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setPreferences({
            sms_notifications_enabled: data.sms_notifications_enabled ?? true,
            sms_new_requests: data.sms_new_requests ?? true,
            sms_recommendations: data.sms_recommendations ?? true,
            sms_visit_reminders: data.sms_visit_reminders ?? true,
            phone_number: data.phone_number ?? null,
          });
        }
      } catch (error) {
        console.error('Error fetching SMS preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const updatePreference = async (key: keyof Omit<SmsPreferences, 'phone_number'>, value: boolean) => {
    if (!user) return;

    setSaving(true);
    const previousValue = preferences[key];
    
    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('SMS preferences updated');
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: previousValue }));
      console.error('Error updating SMS preference:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePhoneNumber = async (phoneNumber: string) => {
    if (!user) return;

    setSaving(true);
    const previousValue = preferences.phone_number;
    
    // Optimistic update
    setPreferences(prev => ({ ...prev, phone_number: phoneNumber }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber || null })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Phone number updated');
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, phone_number: previousValue }));
      console.error('Error updating phone number:', error);
      toast.error('Failed to update phone number');
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    updatePreference,
    updatePhoneNumber,
    hasPhoneNumber: !!preferences.phone_number,
  };
}