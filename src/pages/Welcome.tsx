import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, Star, TrendingUp, Shield, Award } from 'lucide-react';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-3xl mx-auto shadow-lg">
            C
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Welcome to Cravlr</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your path to discover amazing local restaurants and build meaningful connections in your community.
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Food Lover Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/50" onClick={() => navigate('/auth/foodlover')}>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow">
                    <Users className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Star className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold">Food Lover</h2>
                  <p className="text-muted-foreground">
                    Discover hidden gems, share amazing recommendations, and earn rewards for helping your community find great food.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-primary" />
                    </div>
                    <span>Earn points for great recommendations</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <span>Build your foodie reputation</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span>Connect with fellow food lovers</span>
                  </div>
                </div>

                <Button className="w-full group-hover:bg-primary/90 transition-colors" size="lg">
                  Continue as Food Lover
                </Button>

                <div className="text-xs text-muted-foreground">
                  Quick signup • Instant access • Start exploring
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Owner Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/50" onClick={() => navigate('/auth/business')}>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow">
                    <Building2 className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold">Business Owner</h2>
                  <p className="text-muted-foreground">
                    Claim your restaurant, track referrals, and grow your business through verified community recommendations.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <span>Track referral performance</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span>Verified business account</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span>Manage multiple locations</span>
                  </div>
                </div>

                <Button className="w-full group-hover:bg-primary/90 transition-colors" size="lg">
                  Continue as Business Owner
                </Button>

                <div className="text-xs text-muted-foreground">
                  Verification required • Business email • Phone confirmation
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/welcome')} 
              className="text-primary hover:underline font-medium"
            >
              Return to welcome page
            </button>
          </p>
          
          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <button onClick={() => navigate('/sample-accounts')} className="hover:text-primary transition-colors">
              View Sample Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;