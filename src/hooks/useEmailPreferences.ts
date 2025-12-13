import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailPreferences {
  email_notifications_enabled: boolean;
  email_new_requests: boolean;
  email_recommendations: boolean;
  email_visit_reminders: boolean;
}

const defaultPreferences: EmailPreferences = {
  email_notifications_enabled: true,
  email_new_requests: true,
  email_recommendations: true,
  email_visit_reminders: true,
};

export function useEmailPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
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
          .select('email_notifications_enabled, email_new_requests, email_recommendations, email_visit_reminders')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setPreferences({
            email_notifications_enabled: data.email_notifications_enabled ?? true,
            email_new_requests: data.email_new_requests ?? true,
            email_recommendations: data.email_recommendations ?? true,
            email_visit_reminders: data.email_visit_reminders ?? true,
          });
        }
      } catch (error) {
        console.error('Error fetching email preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const updatePreference = async (key: keyof EmailPreferences, value: boolean) => {
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
      
      toast.success('Email preferences updated');
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: previousValue }));
      console.error('Error updating email preference:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateAllPreferences = async (newPreferences: Partial<EmailPreferences>) => {
    if (!user) return;

    setSaving(true);
    const previousPreferences = { ...preferences };
    
    // Optimistic update
    setPreferences(prev => ({ ...prev, ...newPreferences }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update(newPreferences)
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Email preferences updated');
    } catch (error) {
      // Revert on error
      setPreferences(previousPreferences);
      console.error('Error updating email preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    updatePreference,
    updateAllPreferences,
  };
}
