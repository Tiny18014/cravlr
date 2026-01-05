import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  validating: boolean;
  signUp: (email: string, password: string, displayName?: string, userType?: 'regular' | 'business', phoneNumber?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearValidating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Don't reset validating state here - let the auth pages control it
        // setValidating(false); // Removed - this was causing the flash
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, userType: 'regular' | 'business' = 'regular', phoneNumber?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
          user_type: userType,
          phone_number: phoneNumber
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Set validating to true to prevent UI flashing
    setValidating(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 Signing out user...');
    try {
      // Clear any local state first
      setUser(null);
      setSession(null);
      setValidating(false);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      // Even if there's an error, try to clear local state
      setUser(null);
      setSession(null);
      setValidating(false);
      throw error;
    }
  };

  // Function to clear validation state (called by auth pages after validation)
  const clearValidating = () => {
    setValidating(false);
  };

  const value = {
    user,
    session,
    loading,
    validating,
    signUp,
    signIn,
    signOut,
    clearValidating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};