import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  MapPin, Bell, Utensils, Shield, MessageSquareHeart, 
  Lock, Trash2, Save, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Form, FormField } from '@/components/ui/form';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { AppFeedbackSurvey } from '@/components/AppFeedbackSurvey';
import { useUserRoles } from '@/hooks/useUserRoles';
import { LocationSetting } from '@/components/settings/LocationSetting';

// Settings Components
import { ProfileCard } from '@/components/settings/ProfileCard';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { DeleteAccountFlow } from '@/components/settings/DeleteAccountFlow';
import { UnifiedNotificationsSettings } from '@/components/settings/UnifiedNotificationsSettings';
import { EditProfileModal } from '@/components/settings/EditProfileModal';
import { SettingsLayout, SettingsNavItem } from '@/components/settings/SettingsLayout';
import { useIsMobile } from '@/hooks/use-mobile';

const profileFormSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters."),
  location_city: z.string().optional().or(z.literal('')),
  location_state: z.string().optional().or(z.literal('')),
  profile_lat: z.number().nullable().optional(),
  profile_lng: z.number().nullable().optional(),
  profile_country: z.string().optional().or(z.literal('')),
  notification_radius_km: z.number().min(1).max(100).optional(),
  notify_recommender: z.boolean(),
  recommender_paused: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Navigation items for the settings sections - REORGANIZED
const settingsNavItems: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy-security', label: 'Privacy & Security', icon: Shield },
  { id: 'help-feedback', label: 'Help & Feedback', icon: MessageSquareHeart },
  { id: 'account', label: 'Account', icon: Trash2 },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useUserRoles();
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFeedbackSurvey, setShowFeedbackSurvey] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showDeleteFlow, setShowDeleteFlow] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  
  // Location tracking state
  const [savedLocationLabel, setSavedLocationLabel] = useState('');
  const [currentLocationLabel, setCurrentLocationLabel] = useState('');
  const [locationChanged, setLocationChanged] = useState(false);
  
  // User profile state
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userLevel, setUserLevel] = useState('Newbie');
  const [userPoints, setUserPoints] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileImageUpdatedAt, setProfileImageUpdatedAt] = useState<string | null>(null);
  

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onChange',
    defaultValues: {
      display_name: '',
      location_city: '',
      location_state: '',
      profile_lat: null,
      profile_lng: null,
      profile_country: '',
      notification_radius_km: 20,
      notify_recommender: true,
      recommender_paused: false,
    },
  });

  const { isDirty } = form.formState;

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

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        const locationDisplay = profile.location_city && profile.location_state 
          ? `${profile.location_city}, ${profile.location_state}`
          : profile.location_city || '';
        
        setSavedLocationLabel(locationDisplay);
        setCurrentLocationLabel(locationDisplay);
        setLocationChanged(false);
        setUserName(profile.display_name || user?.email?.split('@')[0] || 'User');
        setUserPhone((profile as any).phone_number || '');
        setUserEmail(user?.email || '');
        setUserLevel(profile.level || 'Newbie');
        setUserPoints(profile.points_total || 0);
        setProfileImageUrl((profile as any).profile_image_url || null);
        setProfileImageUpdatedAt(profile?.updated_at || null);
        
        form.reset({
          display_name: profile.display_name || '',
          location_city: profile.location_city || '',
          location_state: profile.location_state || '',
          profile_lat: (profile as any).profile_lat || null,
          profile_lng: (profile as any).profile_lng || null,
          profile_country: (profile as any).profile_country || '',
          notification_radius_km: (profile as any).notification_radius_km || 20,
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
    
    // Check if only location save and nothing changed
    const formDirtyWithoutLocation = Object.keys(form.formState.dirtyFields).some(
      key => !['location_city', 'location_state', 'profile_lat', 'profile_lng', 'profile_country'].includes(key)
    );
    
    const hasLocationChange = locationChanged;
    const hasOtherChanges = formDirtyWithoutLocation;
    
    // If no changes at all
    if (!hasLocationChange && !hasOtherChanges && !form.formState.isDirty) {
      toast({
        title: "No changes made",
        description: "Your settings are already up to date.",
      });
      return;
    }
    
    setSaving(true);
    try {
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
          profile_lat: values.profile_lat,
          profile_lng: values.profile_lng,
          profile_country: values.profile_country,
          notification_radius_km: values.notification_radius_km,
          notify_recommender: values.notify_recommender,
          recommender_paused: values.recommender_paused,
          recommender_paused_at: recommenderPausedAt,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      form.reset(values);
      setUserName(values.display_name);
      
      // Update saved location reference
      const newLocationLabel = values.location_city && values.location_state
        ? `${values.location_city}, ${values.location_state}`
        : values.location_city || '';
      setSavedLocationLabel(newLocationLabel);
      setCurrentLocationLabel(newLocationLabel);
      setLocationChanged(false);

      // Show appropriate message based on what changed
      if (hasLocationChange && !hasOtherChanges) {
        toast({
          title: "Location updated",
          description: "Your default location has been saved.",
        });
      } else if (values.recommender_paused) {
        toast({
          title: "Settings saved",
          description: "Recommender mode paused. You won't receive new requests.",
        });
      } else {
        toast({
          title: "Settings saved",
          description: "Your settings have been updated.",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: requests } = await supabase
        .from('food_requests')
        .select('*')
        .eq('requester_id', user.id);

      const { data: recommendations } = await supabase
        .from('recommendations')
        .select('*')
        .eq('recommender_id', user.id);

      const exportData = {
        profile,
        requests,
        recommendations,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cravlr-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (newName: string, newPhone: string) => {
    if (!user) return;
    
    // Check if phone number changed and if it's a duplicate
    if (newPhone && newPhone !== userPhone) {
      const normalizedPhone = newPhone.replace(/\s+/g, '').trim();
      
      // Check if phone number already exists for another user
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .neq('id', user.id)
        .limit(1);
      
      if (checkError) {
        console.error('[Profile] Error checking phone duplicate:', checkError);
      }
      
      if (existingProfiles && existingProfiles.length > 0) {
        console.log('[Profile] Duplicate phone number detected');
        throw new Error('An account with this phone number already exists. Please use a different number.');
      }
    }
    
    const updates: any = {
      display_name: newName,
      phone_number: newPhone,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    
    setUserName(newName);
    setUserPhone(newPhone);
    form.setValue('display_name', newName);
    
    toast({
      title: "Profile Updated",
      description: "Your profile details have been updated.",
    });
  };

  // Render content for each section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <ProfileCard
              userName={userName}
              profileImageUrl={profileImageUrl}
              onImageChange={(url) => {
                setProfileImageUrl(url);
                setProfileImageUpdatedAt(new Date().toISOString());
              }}
              onEditProfile={() => setShowEditProfileModal(true)}
            />
          </div>
        );

      case 'preferences':
        return (
          <SettingsSection title="Preferences" icon={MapPin}>
            {/* Default Location - Single editable field */}
            <LocationSetting
              initialCity={form.getValues('location_city') || ''}
              initialState={form.getValues('location_state') || ''}
              initialLat={form.getValues('profile_lat')}
              initialLng={form.getValues('profile_lng')}
              initialCountry={form.getValues('profile_country') || ''}
              onLocationChange={(location) => {
                form.setValue('location_city', location.city, { shouldDirty: true });
                form.setValue('location_state', location.state, { shouldDirty: true });
                form.setValue('profile_lat', location.lat, { shouldDirty: true });
                form.setValue('profile_lng', location.lng, { shouldDirty: true });
                form.setValue('profile_country', location.country, { shouldDirty: true });
                setCurrentLocationLabel(location.displayLabel);
                setLocationChanged(location.displayLabel !== savedLocationLabel);
              }}
            />

            {/* Notification Radius */}
            <FormField
              control={form.control}
              name="notification_radius_km"
              render={({ field }) => {
                const kmToMiles = (km: number) => Math.round(km * 0.621371);
                const milesToKm = (miles: number) => Math.round(miles / 0.621371);
                const displayMiles = kmToMiles(field.value || 20);
                
                return (
                  <div className="py-4 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">Notification Radius</p>
                      <span className="text-sm font-semibold text-primary">{displayMiles} miles</span>
                    </div>
                    <Slider
                      value={[displayMiles]}
                      onValueChange={(values) => field.onChange(milesToKm(values[0]))}
                      min={1}
                      max={60}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Get notified about requests within this distance
                    </p>
                  </div>
                );
              }}
            />

            {/* Recommender Mode */}
            <FormField
              control={form.control}
              name="recommender_paused"
              render={({ field }) => (
                <div className="border-t border-border">
                  <SettingsRow
                    label="Pause Recommender Mode"
                    description="Stop receiving new food requests from others"
                    icon={Utensils}
                    toggle={{
                      checked: field.value,
                      onChange: field.onChange,
                    }}
                  />
                </div>
              )}
            />

            {/* Theme Selector */}
            <div className="border-t border-border">
              <ThemeSelector />
            </div>
          </SettingsSection>
        );

      case 'notifications':
        return <UnifiedNotificationsSettings form={form} />;

      case 'privacy-security':
        return (
          <SettingsSection title="Privacy & Security" icon={Shield}>
            <SettingsRow
              label="Change Password"
              description="Update your account password"
              icon={Lock}
              onClick={() => setShowPasswordModal(true)}
              showChevron
            />
          </SettingsSection>
        );

      case 'help-feedback':
        return (
          <SettingsSection title="Help & Feedback" icon={MessageSquareHeart}>
            <SettingsRow
              label="Share Feedback"
              description="Help us improve Cravlr with your thoughts"
              onClick={() => setShowFeedbackSurvey(true)}
              showChevron
            />
          </SettingsSection>
        );

      case 'account':
        return (
          <SettingsSection title="Account" icon={Trash2}>
            <SettingsRow
              label="Delete Account"
              description="Permanently delete your Cravlr account"
              icon={Trash2}
              danger
              onClick={() => setShowDeleteFlow(true)}
              showChevron
            />
          </SettingsSection>
        );

      default:
        return null;
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  // Show Delete Account Flow
  if (showDeleteFlow) {
    return <DeleteAccountFlow onBack={() => setShowDeleteFlow(false)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <DashboardHeader 
        onSignOut={signOut} 
        userName={userName}
        profileImageUrl={profileImageUrl}
        profileImageUpdatedAt={profileImageUpdatedAt}
      />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
        </div>

        {/* Notification Permission Banner */}
        <NotificationPermissionBanner className="mb-6" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SettingsLayout
              navItems={settingsNavItems}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            >
              {renderSectionContent()}
            </SettingsLayout>

            {/* Save Button - Fixed at bottom when dirty */}
            {isDirty && (
              <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg z-50">
                <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">You have unsaved changes</p>
                  <Button type="submit" disabled={saving} className="min-w-[140px]">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
      
      {/* Modals */}
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={setShowPasswordModal} 
      />
      
      <EditProfileModal
        open={showEditProfileModal}
        onOpenChange={setShowEditProfileModal}
        currentName={userName}
        currentPhone={userPhone}
        onSave={handleUpdateProfile}
      />
      
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
