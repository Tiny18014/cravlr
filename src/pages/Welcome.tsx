import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, Store, Star, Trophy, Users, BarChart3, Shield, MapPin, Sparkles } from 'lucide-react';
import { ExitIntentFeedbackTrigger } from '@/components/ExitIntentFeedbackTrigger';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-bg relative overflow-hidden">
      {/* Subtle food-themed background illustrations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 text-plum/5 transform -rotate-12">
          <Utensils size={120} />
        </div>
        <div className="absolute bottom-32 right-16 text-plum/5 transform rotate-45">
          <Sparkles size={100} />
        </div>
        <div className="absolute top-1/3 right-10 text-plum/5 transform -rotate-6">
          <Star size={80} />
        </div>
        <div className="absolute bottom-20 left-20 text-plum/5 transform rotate-12">
          <Trophy size={90} />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-5xl w-full space-y-12">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-plum text-white shadow-lg mx-auto">
              <Utensils className="h-9 w-9" strokeWidth={2.5} />
              <MapPin className="h-5 w-5 absolute translate-x-3 translate-y-3" strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                Welcome to Cravlr
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Discover amazing local restaurants and build meaningful connections in your community.
              </p>
            </div>
          </div>

          {/* Choice Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Food Lover Card */}
            <Card 
              className="group cursor-pointer border-2 border-gray-200 hover:border-plum/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white"
              onClick={() => navigate('/auth/foodlover')}
            >
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 bg-plum/10 rounded-2xl flex items-center justify-center group-hover:bg-plum/20 transition-colors">
                        <Utensils className="h-10 w-10 text-plum" strokeWidth={2} />
                      </div>
                      <div className="absolute -top-2 -right-2 h-8 w-8 bg-plum rounded-full flex items-center justify-center animate-pulse">
                        <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Food Lover
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      Find hidden gems, share real recommendations, and earn rewards as you explore new food spots.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                      <div className="h-6 w-6 bg-plum/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="h-3.5 w-3.5 text-plum fill-plum" />
                      </div>
                      <span>Earn points for great recommendations</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                      <div className="h-6 w-6 bg-plum/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Trophy className="h-3.5 w-3.5 text-plum" />
                      </div>
                      <span>Unlock badges as your foodie level grows</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                      <div className="h-6 w-6 bg-plum/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="h-3.5 w-3.5 text-plum" />
                      </div>
                      <span>Connect with fellow food lovers</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    className="w-full bg-plum hover:bg-plum-dark text-white font-semibold text-base h-12 rounded-lg transition-all duration-200 hover:shadow-lg"
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
              className="group cursor-pointer border-2 border-gray-200 hover:border-plum/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white"
              onClick={() => navigate('/auth/business')}
            >
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 bg-plum/10 rounded-2xl flex items-center justify-center group-hover:bg-plum/20 transition-colors">
                        <Store className="h-10 w-10 text-plum" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Business Owner
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      Grow your restaurant through verified recommendations and real community insights.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                      <div className="h-6 w-6 bg-plum/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <BarChart3 className="h-3.5 w-3.5 text-plum" />
                      </div>
                      <span>Track referral performance</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                      <div className="h-6 w-6 bg-plum/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="h-3.5 w-3.5 text-plum" />
                      </div>
                      <span>Verified business profile</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                      <div className="h-6 w-6 bg-plum/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Store className="h-3.5 w-3.5 text-plum" />
                      </div>
                      <span>Manage multiple locations</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    className="w-full bg-plum hover:bg-plum-dark text-white font-semibold text-base h-12 rounded-lg transition-all duration-200 hover:shadow-lg"
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
            <p className="text-gray-600">
              Already have an account?{' '}
              <button 
                onClick={() => navigate('/auth/foodlover')}
                className="text-plum font-semibold hover:text-plum-dark transition-colors underline underline-offset-2"
              >
                Log in
              </button>
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <button 
                onClick={() => navigate('/how-it-works')}
                className="hover:text-plum transition-colors"
              >
                How it works
              </button>
              <span>•</span>
              <button 
                onClick={() => navigate('/privacy')}
                className="hover:text-plum transition-colors"
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