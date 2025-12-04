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
import { User, MapPin, Save, MessageSquareHeart, Bell, Utensils } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import AccountDeletion from '@/components/AccountDeletion';
import { AppFeedbackSurvey } from '@/components/AppFeedbackSurvey';
import { useUserRoles } from '@/hooks/useUserRoles';
import { DashboardHeader } from '@/components/DashboardHeader';
import { RecommenderProgress } from '@/components/RecommenderProgress';

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
  recommender_paused: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showFeedbackSurvey, setShowFeedbackSurvey] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLevel, setUserLevel] = useState('Newbie');
  const [userPoints, setUserPoints] = useState(0);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: '',
      location_city: '',
      location_state: '',
      notify_recommender: true,
      recommender_paused: false,
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
        .eq('id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        const locationDisplay = profile.location_city && profile.location_state 
          ? `${profile.location_city}, ${profile.location_state}`
          : '';
        
        setLocationInput(locationDisplay);
        setUserName(profile.display_name || user?.email?.split('@')[0] || 'User');
        setUserLevel(profile.level || 'Newbie');
        setUserPoints(profile.points_total || 0);
        
        form.reset({
          display_name: profile.display_name || '',
          location_city: profile.location_city || '',
          location_state: profile.location_state || '',
          notify_recommender: profile.notify_recommender ?? true,
          recommender_paused: profile.recommender_paused ?? false,
        });
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
      // If recommender_paused changed to true, set the paused_at timestamp
      const recommenderPausedAt = values.recommender_paused 
        ? new Date().toISOString() 
        : null;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: values.display_name,
          location_city: values.location_city,
          location_state: values.location_state,
          notify_recommender: values.notify_recommender,
          recommender_paused: values.recommender_paused,
          recommender_paused_at: recommenderPausedAt,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("❌ Profile update error:", error);
        throw error;
      }

      console.log("✅ Profile updated successfully");
      
      form.reset(values);

      toast({
        title: "Profile updated",
        description: values.recommender_paused 
          ? "Recommender mode paused. You won't receive new requests."
          : "Your profile has been successfully updated.",
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
    <div className="min-h-screen bg-background pb-20">
      <DashboardHeader onSignOut={signOut} userName={userName} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Recommender Progress - Only show for recommenders */}
        {hasRole('recommender') && (
          <div className="mb-6">
            <RecommenderProgress level={userLevel} currentPoints={userPoints} />
          </div>
        )}

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
                      form.setValue('location_city', city, { shouldDirty: true });
                      form.setValue('location_state', state, { shouldDirty: true });
                    }}
                    placeholder="Type a city name (e.g., Charlotte, Austin, etc.)"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Your location helps us show you relevant food requests and recommendations in your area.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recommender Mode Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Recommender Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="recommender_paused"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Pause Recommender Mode
                        </FormLabel>
                        <FormDescription>
                          When paused, you won't receive new food requests from others. 
                          You can still browse and make requests yourself.
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