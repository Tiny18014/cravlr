import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBusinessVerification } from '@/hooks/useBusinessVerification';
import { Phone, Mail, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface BusinessVerificationFlowProps {
  claimId: string;
  businessEmail: string;
  businessPhone: string;
  restaurantName: string;
  onVerificationComplete: () => void;
}

export const BusinessVerificationFlow: React.FC<BusinessVerificationFlowProps> = ({
  claimId,
  businessEmail,
  businessPhone,
  restaurantName,
  onVerificationComplete
}) => {
  const [phoneCode, setPhoneCode] = useState('');
  const [currentStep, setCurrentStep] = useState<'phone' | 'email' | 'complete'>('phone');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  
  const {
    sendPhoneVerification,
    verifyPhoneCode,
    verifyBusinessEmailDomain,
    getVerificationStatus,
    validateBusinessEmail,
    loading
  } = useBusinessVerification();

  useEffect(() => {
    // Check current verification status
    const checkStatus = async () => {
      const status = await getVerificationStatus(claimId);
      if (status) {
        setPhoneVerified(status.phoneVerified);
        setEmailVerified(status.emailVerified);
        
        if (status.phoneVerified && status.emailVerified) {
          setCurrentStep('complete');
          onVerificationComplete();
        } else if (status.phoneVerified) {
          setCurrentStep('email');
        }
      }
    };

    checkStatus();
  }, [claimId, getVerificationStatus, onVerificationComplete]);

  const handleSendPhoneCode = async () => {
    const success = await sendPhoneVerification(claimId, businessPhone);
    if (success) {
      setCodeSent(true);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (phoneCode.length !== 6) return;
    
    const success = await verifyPhoneCode(claimId, phoneCode);
    if (success) {
      setPhoneVerified(true);
      setCurrentStep('email');
      // Auto-verify email domain
      await handleVerifyEmailDomain();
    }
  };

  const handleVerifyEmailDomain = async () => {
    const isVerified = await verifyBusinessEmailDomain(businessEmail, restaurantName);
    if (isVerified) {
      setEmailVerified(true);
      setCurrentStep('complete');
      onVerificationComplete();
    }
  };

  const emailValidation = validateBusinessEmail(businessEmail);
  const progress = phoneVerified && emailVerified ? 100 : phoneVerified ? 50 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Business Verification
          </CardTitle>
          <CardDescription>
            Complete these steps to verify your business ownership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Verification Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={phoneVerified ? 'text-green-600' : ''}>Phone</span>
              <span className={emailVerified ? 'text-green-600' : ''}>Email</span>
              <span className={phoneVerified && emailVerified ? 'text-green-600' : ''}>Complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Verification Step */}
      {currentStep === 'phone' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Verification
              {phoneVerified && <CheckCircle className="h-5 w-5 text-green-600" />}
            </CardTitle>
            <CardDescription>
              Verify your business phone number: {businessPhone}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!codeSent ? (
              <Button 
                onClick={handleSendPhoneCode} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneCode">Enter 6-digit code</Label>
                  <Input
                    id="phoneCode"
                    placeholder="000000"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleVerifyPhoneCode}
                    disabled={loading || phoneCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleSendPhoneCode}
                    disabled={loading}
                  >
                    Resend
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Code expires in 15 minutes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Verification Step */}
      {currentStep === 'email' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Domain Verification
              {emailVerified && <CheckCircle className="h-5 w-5 text-green-600" />}
            </CardTitle>
            <CardDescription>
              Verifying business email: {businessEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
              {emailValidation.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {emailValidation.isValid 
                    ? 'Business email detected' 
                    : 'Generic email detected'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {emailValidation.isValid 
                    ? 'Your business domain will be automatically verified.'
                    : emailValidation.reason
                  }
                </p>
              </div>
            </div>

            <Button 
              onClick={handleVerifyEmailDomain}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Email Domain'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completion Step */}
      {currentStep === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Verification Complete!
            </CardTitle>
            <CardDescription>
              Your business has been successfully verified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Phone className="h-3 w-3 mr-1" />
                  Phone Verified
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Mail className="h-3 w-3 mr-1" />
                  Email Verified
                </Badge>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  🎉 Your restaurant claim is now under review. You'll receive an email notification 
                  once an admin approves your claim (typically within 1-2 business days).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {phoneVerified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={phoneVerified ? 'text-green-600' : ''}>
                Phone number verification
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {emailVerified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={emailVerified ? 'text-green-600' : ''}>
                Business email domain verification
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Admin review and approval</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Access to business dashboard</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};