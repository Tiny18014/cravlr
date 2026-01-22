import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, KeyRound } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 6;

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password validation state
  const [validation, setValidation] = useState({
    minLength: false,
    match: false,
  });

  // Check for valid session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log('[ResetPassword] Checking for valid recovery session...');
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[ResetPassword] Session error:', sessionError);
          setLinkInvalid(true);
          setInitializing(false);
          return;
        }
        
        if (!session) {
          console.log('[ResetPassword] No valid session - link may have been used or expired');
          setLinkInvalid(true);
          setInitializing(false);
          return;
        }
        
        console.log('[ResetPassword] Valid session found, user can reset password');
        setInitializing(false);
        
      } catch (err) {
        console.error('[ResetPassword] Error checking session:', err);
        setLinkInvalid(true);
        setInitializing(false);
      }
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    // Real-time password validation
    setValidation({
      minLength: password.length >= MIN_PASSWORD_LENGTH,
      match: password === confirmPassword && confirmPassword.length > 0,
    });
    
    console.log('[ResetPassword] Password validation:', {
      minLength: password.length >= MIN_PASSWORD_LENGTH,
      match: password === confirmPassword && confirmPassword.length > 0,
    });
  }, [password, confirmPassword]);

  const isFormValid = validation.minLength && validation.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Please ensure all password requirements are met.');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('[ResetPassword] Updating password...');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('[ResetPassword] Error updating password:', updateError);
        
        if (updateError.message.includes('expired') || updateError.message.includes('invalid')) {
          setError('Reset link has expired or is invalid. Please request a new one.');
        } else {
          setError(updateError.message || 'Failed to update password. Please try again.');
        }
        return;
      }

      console.log('[ResetPassword] Password updated successfully');
      
      // Sign out the user so they can sign in with their new password
      console.log('[ResetPassword] Signing out user after password reset...');
      await supabase.auth.signOut();
      console.log('[ResetPassword] User signed out');
      
      setSuccess(true);
      
      toast({
        title: "Password Updated!",
        description: "Your password has been changed successfully. Please sign in with your new password.",
      });

      // Redirect to sign-in after 3 seconds
      console.log('[ResetPassword] Redirecting to sign-in...');
      setTimeout(() => {
        navigate('/auth/foodlover');
      }, 3000);
      
    } catch (err) {
      console.error('[ResetPassword] Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${valid ? 'text-primary' : 'text-muted-foreground'}`}>
      {valid ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/50" />
      )}
      <span>{text}</span>
    </div>
  );

  // Show loading while checking session
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if link is invalid or already used
  if (linkInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Link Expired or Already Used</CardTitle>
            <CardDescription>
              This password reset link has already been used or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth/foodlover')} className="mt-4">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Password Updated!</CardTitle>
            <CardDescription>
              Your password has been changed successfully. Redirecting to sign in...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth/foodlover')} className="mt-4">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
              <ValidationItem valid={validation.minLength} text={`At least ${MIN_PASSWORD_LENGTH} characters`} />
              <ValidationItem valid={validation.match} text="Passwords match" />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !isFormValid}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={async () => {
                console.log('[ResetPassword] Back to Sign In clicked - signing out...');
                await supabase.auth.signOut();
                navigate('/auth/foodlover');
              }}
              className="text-sm"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
