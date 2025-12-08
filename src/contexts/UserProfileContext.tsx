import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface UserProfile {
  id: string;
  display_name: string | null;
  profile_image_url: string | null;
  profile_image_updated_at: string | null;
  location_city: string | null;
  location_state: string | null;
  profile_lat: number | null;
  profile_lng: number | null;
  profile_country: string | null;
  notification_radius_km: number | null;
  notify_recommender: boolean;
  recommender_paused: boolean;
  level: string | null;
  points_total: number | null;
  streak_count: number;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  updateProfileImage: (imageUrl: string | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setProfile({
          id: data.id,
          display_name: data.display_name,
          profile_image_url: (data as any).profile_image_url || null,
          profile_image_updated_at: data.updated_at || null,
          location_city: data.location_city,
          location_state: data.location_state,
          profile_lat: (data as any).profile_lat || null,
          profile_lng: (data as any).profile_lng || null,
          profile_country: (data as any).profile_country || null,
          notification_radius_km: (data as any).notification_radius_km || 20,
          notify_recommender: data.notify_recommender ?? true,
          recommender_paused: data.recommender_paused ?? false,
          level: data.level,
          points_total: data.points_total,
          streak_count: data.streak_count,
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Subscribe to profile changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          fetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProfile]);

  const updateProfileImage = useCallback((imageUrl: string | null) => {
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        profile_image_url: imageUrl,
        profile_image_updated_at: new Date().toISOString(),
      };
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
      };
    });
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        isLoading,
        error,
        refreshProfile: fetchProfile,
        updateProfileImage,
        updateProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
