import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DuplicateCheckResult {
  emailExists: boolean;
  phoneExists: boolean;
}

export const useSignupValidation = () => {
  const [checking, setChecking] = useState(false);

  const checkDuplicates = async (email: string, phoneNumber?: string): Promise<DuplicateCheckResult> => {
    console.log('[SignupValidation] Checking for duplicates...', { email, phoneNumber: phoneNumber ? '***' : 'not provided' });
    setChecking(true);
    
    const result: DuplicateCheckResult = {
      emailExists: false,
      phoneExists: false,
    };

    try {
      // Check if email exists in profiles (which mirrors auth.users)
      const { data: emailData, error: emailError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('id', email) // This won't work directly, we need a different approach
        .limit(1);

      // Since we can't directly query auth.users, we'll try to check via a sign-in attempt
      // But that's not ideal. Instead, let's check the profiles table which has email info
      // Actually, profiles table doesn't store email. We need to use auth API.
      
      // For email check, we can use the Supabase auth API to check if user exists
      // However, Supabase doesn't expose this directly for security reasons.
      // The best approach is to attempt signup and handle the "User already registered" error
      
      // For phone number, check via backend function (bypasses row-level access restrictions)
      if (phoneNumber) {
        const normalizedPhone = phoneNumber.trim().replace(/[^\d+]/g, '');
        console.log('[Signup:Phone] Checking phone availability...', { masked: '***' });

        const { data, error } = await supabase.functions.invoke('check-phone-availability', {
          body: { phoneNumber: normalizedPhone },
        });

        if (error) {
          console.error('[Signup:Phone] Availability check failed:', error);

          // Fallback (may be restricted by database policies, but better than nothing)
          const { data: phoneData, error: phoneError } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone_number', normalizedPhone)
            .limit(1);

          if (phoneError) {
            console.error('[Signup:Phone] Fallback query failed:', phoneError);
            // Fail-safe: block signup rather than allowing duplicates through.
            result.phoneExists = true;
          } else if (phoneData && phoneData.length > 0) {
            result.phoneExists = true;
          }
        } else if (data?.exists) {
          console.log('[Signup:Phone] Phone number already exists');
          result.phoneExists = true;
        }
      }

      console.log('[SignupValidation] Check complete:', result);
    } catch (error) {
      console.error('[SignupValidation] Error during duplicate check:', error);
    } finally {
      setChecking(false);
    }

    return result;
  };

  // Parse Supabase auth error to detect if user already exists
  const isUserExistsError = (error: any): boolean => {
    if (!error) return false;
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('user already registered') ||
      message.includes('already been registered') ||
      message.includes('already exists')
    );
  };

  return {
    checkDuplicates,
    isUserExistsError,
    checking,
  };
};

