import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Shield, Loader2 } from 'lucide-react';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { toast } from 'sonner';

interface EmailVerificationRequiredProps {
  action: string;
  children?: React.ReactNode;
}

export const EmailVerificationRequired: React.FC<EmailVerificationRequiredProps> = ({ 
  action, 
  children 
}) => {
  const { isVerified, loading, resendVerification } = useEmailVerification();
  const [sending, setSending] = useState(false);

  const handleResendVerification = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Checking verification status...</span>
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle>Email Verification Required</CardTitle>
        <CardDescription>
          To {action}, you need to verify your email address first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            We've sent a verification link to your email. Please check your inbox and click the link to verify your account.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Button 
            onClick={handleResendVerification}
            disabled={sending}
            className="w-full"
            variant="outline"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            Already verified? Refresh the page to continue.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};