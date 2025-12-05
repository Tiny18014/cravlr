import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, Store, Star, Trophy, Users, BarChart3, Shield, MapPin, Sparkles } from 'lucide-react';
import { ExitIntentFeedbackTrigger } from '@/components/ExitIntentFeedbackTrigger';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <div className="max-w-5xl w-full space-y-10">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary text-primary-foreground shadow-lg mx-auto">
              <Utensils className="h-9 w-9" strokeWidth={2.5} />
              <MapPin className="h-5 w-5 absolute translate-x-3 translate-y-3" strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight">
                Welcome to Cravlr
              </h1>
              <p className="text-body-large text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Discover amazing local restaurants and build meaningful connections in your community.
              </p>
            </div>
          </div>

          {/* Choice Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Food Lover Card */}
            <Card 
              className="group cursor-pointer border-0 hover:shadow-[0_8px_24px_rgba(160,50,114,0.12)] transition-all duration-300 hover:-translate-y-1"
              onClick={() => navigate('/auth/foodlover')}
            >
              <CardContent>
                <div className="space-y-6">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 bg-primary-light rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform p-5">
                        <Utensils className="h-10 w-10 text-primary" strokeWidth={2} />
                      </div>
                      <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
                        <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-3">
                    <h3 className="font-semibold text-card-foreground">
                      Food Lover
                    </h3>
                    <p className="text-body text-muted-foreground leading-relaxed">
                      Find hidden gems, share real recommendations, and earn rewards as you explore new food spots.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-small text-muted-foreground">
                      <div className="h-6 w-6 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                      </div>
                      <span>Earn points for great recommendations</span>
                    </div>
                    <div className="flex items-start gap-3 text-small text-muted-foreground">
                      <div className="h-6 w-6 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Trophy className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Unlock badges as your foodie level grows</span>
                    </div>
                    <div className="flex items-start gap-3 text-small text-muted-foreground">
                      <div className="h-6 w-6 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Connect with fellow food lovers</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/auth/foodlover');
                    }}
                  >
                    Continue as Food Lover →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Business Owner Card */}
            <Card 
              className="group cursor-pointer border-0 hover:shadow-[0_8px_24px_rgba(160,50,114,0.12)] transition-all duration-300 hover:-translate-y-1"
              onClick={() => navigate('/auth/business')}
            >
              <CardContent>
                <div className="space-y-6">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 bg-primary-light rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform p-5">
                        <Store className="h-10 w-10 text-primary" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-3">
                    <h3 className="font-semibold text-card-foreground">
                      Business Owner
                    </h3>
                    <p className="text-body text-muted-foreground leading-relaxed">
                      Grow your restaurant through verified recommendations and real community insights.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-small text-muted-foreground">
                      <div className="h-6 w-6 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Track referral performance</span>
                    </div>
                    <div className="flex items-start gap-3 text-small text-muted-foreground">
                      <div className="h-6 w-6 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Verified business profile</span>
                    </div>
                    <div className="flex items-start gap-3 text-small text-muted-foreground">
                      <div className="h-6 w-6 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Store className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Manage multiple locations</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/auth/business');
                    }}
                  >
                    Continue as Business Owner →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4 pb-8">
            <p className="text-body text-muted-foreground">
              Already have an account?{' '}
              <button 
                onClick={() => navigate('/auth/foodlover')}
                className="text-primary font-semibold hover:text-primary-dark transition-colors underline underline-offset-2"
              >
                Log in
              </button>
            </p>
            <div className="flex items-center justify-center gap-4 text-small text-muted-foreground">
              <button 
                onClick={() => navigate('/how-it-works')}
                className="hover:text-primary transition-colors"
              >
                How it works
              </button>
              <span>•</span>
              <button 
                onClick={() => navigate('/privacy')}
                className="hover:text-primary transition-colors"
              >
                Privacy & Verification
              </button>
            </div>
          </div>
        </div>
      </div>

      <ExitIntentFeedbackTrigger role="requester" sourceAction="welcome_page" />
    </div>
  );
};

export default Welcome;