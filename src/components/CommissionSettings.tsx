import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface CommissionSettingsProps {
  userId: string;
}

export function CommissionSettings({ userId }: CommissionSettingsProps) {
  const [defaultTicketValue, setDefaultTicketValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('default_ticket_value')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.default_ticket_value) {
        setDefaultTicketValue(data.default_ticket_value.toString());
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const value = defaultTicketValue ? parseFloat(defaultTicketValue) : null;
      
      const { error } = await supabase
        .from('business_profiles')
        .update({ default_ticket_value: value })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your commission settings have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Commission Settings
        </CardTitle>
        <CardDescription>
          Configure your default commission settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="defaultTicket">
            Default Average Ticket Value (Optional)
          </Label>
          <Input
            id="defaultTicket"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 45.00"
            value={defaultTicketValue}
            onChange={(e) => setDefaultTicketValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This value will be used when you don't enter a specific amount for a visit.
            Your commission is calculated at 10% of the ticket value.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
