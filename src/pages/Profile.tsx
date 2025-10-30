import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, MapPin, Bell, Save, MessageSquareHeart } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { useNotifications } from '@/contexts/UnifiedNotificationContext';
import AccountDeletion from '@/components/AccountDeletion';
import { AppFeedbackSurvey } from '@/components/AppFeedbackSurvey';
import { useUserRoles } from '@/hooks/useUserRoles';

const profileFormSchema = z.object({
  display_name: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  location_city: z.string().min(2, {
    message: "City is required.",
  }),
  location_state: z.string().min(2, {
    message: "State is required.",
  }),
  notify_recommender: z.boolean(),
  do_not_disturb: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dnd, setDnd } = useNotifications();
  const { hasRole } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showFeedbackSurvey, setShowFeedbackSurvey] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: '',
      location_city: '',
      location_state: '',
      notify_recommender: true,
      do_not_disturb: false,
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        const locationDisplay = profile.location_city && profile.location_state 
          ? `${profile.location_city}, ${profile.location_state}`
          : '';
        
        setLocationInput(locationDisplay);
        
        form.reset({
          display_name: profile.display_name || '',
          location_city: profile.location_city || '',
          location_state: profile.location_state || '',
          notify_recommender: profile.notify_recommender ?? true,
          do_not_disturb: profile.do_not_disturb ?? false,
        });
        
        // Sync with notification context
        setDnd(profile.do_not_disturb ?? false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    console.log("💾 Submitting profile form:", values);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          display_name: values.display_name,
          location_city: values.location_city,
          location_state: values.location_state,
          notify_recommender: values.notify_recommender,
          do_not_disturb: values.do_not_disturb,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("❌ Profile update error:", error);
        throw error;
      }

      console.log("✅ Profile updated successfully");
      
      // Reset form with new values to clear dirty state
      form.reset(values);
      
      // Sync DND state with notification context
      setDnd(values.do_not_disturb);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <User className="h-8 w-8" />
                Profile Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your personal information and preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="How others will see you" {...field} />
                      </FormControl>
                      <FormDescription>
                        This name will be visible to other users when you make recommendations.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Location Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="location-input">City and State</Label>
                  <CityAutocomplete
                    value={locationInput}
                    onValueChange={setLocationInput}
                    onCitySelect={(city, state) => {
                      form.setValue('location_city', city);
                      form.setValue('location_state', state);
                    }}
                    placeholder="Type a city name (e.g., Charlotte, Austin, etc.)"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Your location helps us show you relevant food requests and recommendations in your area.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="notify_recommender"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Food Request Notifications
                        </FormLabel>
                        <FormDescription>
                          Get notified when new food requests are posted in your area.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="do_not_disturb"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Do Not Disturb
                        </FormLabel>
                        <FormDescription>
                          Temporarily pause all notifications.
                        </FormDescription>
                      </div>
                      <FormControl>
                         <Switch
                           checked={field.value}
                           onCheckedChange={(checked) => {
                             console.log("🔄 DND toggle clicked:", checked);
                             field.onChange(checked);
                             // Don't sync to context here - let form submission handle it
                           }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* App Feedback Button */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareHeart className="h-5 w-5" />
                  Share Your Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Help us improve Cravlr by sharing your thoughts about the app experience.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackSurvey(true)}
                  className="w-full"
                >
                  Give Feedback
                </Button>
              </CardContent>
            </Card>

            {/* Account Deletion Section */}
            <AccountDeletion />

            {/* Save Button */}
            <div className="flex items-center justify-between">
              {form.formState.isDirty && (
                <p className="text-sm text-muted-foreground">
                  You have unsaved changes
                </p>
              )}
              <div className={form.formState.isDirty ? "" : "ml-auto"}>
                <Button 
                  type="submit" 
                  disabled={saving || !form.formState.isDirty} 
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </main>
      
      <AppFeedbackSurvey
        open={showFeedbackSurvey}
        onOpenChange={setShowFeedbackSurvey}
        role={hasRole('recommender') ? 'recommender' : 'requester'}
        sourceAction="manual_from_profile"
      />
    </div>
  );
};

export default Profile;