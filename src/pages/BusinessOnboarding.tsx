import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { BusinessVerificationFlow } from '@/components/BusinessVerificationFlow';
import BusinessClaim from '@/pages/BusinessClaim';
import { Building2, CheckCircle, Clock, ArrowRight, Shield } from 'lucide-react';

type OnboardingStep = 'welcome' | 'claim' | 'verification' | 'complete';

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { fetchBusinessClaims } = useBusinessClaims();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [businessClaim, setBusinessClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user already has a business claim
    const checkExistingClaim = async () => {
      setLoading(true);
      try {
        const claims = await fetchBusinessClaims(user.id);
        if (claims && claims.length > 0) {
          const claim = claims[0];
          setBusinessClaim(claim);
          
          // Determine current step based on claim status
          if (claim.status === 'verified') {
            setCurrentStep('complete');
          } else if (claim.verification_step === 'phone_verification' || 
                     claim.verification_step === 'email_verification') {
            setCurrentStep('verification');
          } else {
            setCurrentStep('claim');
          }
        } else {
          // Check if we should skip welcome (from signup flow)
          if (searchParams.get('from') === 'signup') {
            setCurrentStep('claim');
          } else {
            setCurrentStep('welcome');
          }
        }
      } catch (error) {
        console.error('Error checking business claims:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingClaim();
  }, [user, navigate, fetchBusinessClaims, searchParams]);

  const handleClaimSubmitted = (claimData: any) => {
    setBusinessClaim(claimData);
    setCurrentStep('verification');
  };

  const handleVerificationComplete = () => {
    setCurrentStep('complete');
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'welcome': return 0;
      case 'claim': return 25;
      case 'verification': return 75;
      case 'complete': return 100;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Business Account Setup</h1>
            <Badge variant={currentStep === 'complete' ? 'default' : 'secondary'}>
              {currentStep === 'complete' ? 'Complete' : 'In Progress'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Progress value={getStepProgress()} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Welcome</span>
              <span>Restaurant Claim</span>
              <span>Verification</span>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-primary" />
                <CardTitle className="text-3xl">Welcome to Cravlr for Business!</CardTitle>
                <CardDescription className="text-lg">
                  Join our platform to track referrals, manage your restaurant profile, and earn commissions
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Secure Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Multi-step verification process ensures only legitimate business owners can claim restaurants
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Building2 className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Restaurant Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage your restaurant profile, track referral performance, and analyze customer acquisition
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CheckCircle className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Earn Commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get paid for successful referrals and track your commission earnings in real-time
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Complete these steps to set up your business account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">1</div>
                    <span className="text-sm">Claim your restaurant</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">2</div>
                    <span className="text-sm text-muted-foreground">Verify phone & email</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">3</div>
                    <span className="text-sm text-muted-foreground">Wait for admin approval</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">4</div>
                    <span className="text-sm text-muted-foreground">Access business dashboard</span>
                  </div>
                </div>

                <Button 
                  onClick={() => setCurrentStep('claim')}
                  className="w-full mt-6"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Restaurant Claim Step */}
        {currentStep === 'claim' && (
          <div>
            <BusinessClaim />
          </div>
        )}

        {/* Verification Step */}
        {currentStep === 'verification' && businessClaim && (
          <BusinessVerificationFlow
            claimId={businessClaim.id}
            businessEmail={businessClaim.business_email}
            businessPhone={businessClaim.business_phone}
            restaurantName={businessClaim.restaurant_name}
            onVerificationComplete={handleVerificationComplete}
          />
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <CardTitle className="text-3xl text-green-600">All Set!</CardTitle>
                <CardDescription className="text-lg">
                  Your business account setup is complete
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Your restaurant claim has been submitted and verified. An admin will review your claim within 1-2 business days.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Awaiting admin approval</p>
                      <p className="text-xs text-muted-foreground">Typically completed within 1-2 business days</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email notification</p>
                      <p className="text-xs text-muted-foreground">You'll receive an email once approved</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Access business dashboard</p>
                      <p className="text-xs text-muted-foreground">Track referrals and manage your restaurant</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                    Return to App
                  </Button>
                  <Button onClick={() => navigate('/business/dashboard')} className="flex-1">
                    View Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}