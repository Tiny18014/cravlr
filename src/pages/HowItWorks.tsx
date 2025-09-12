import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  Star, 
  TrendingUp, 
  Shield, 
  Award,
  CheckCircle,
  ArrowRight,
  MapPin,
  MessageSquare,
  DollarSign,
  BarChart3,
  Clock,
  UserCheck
} from 'lucide-react';

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Building2,
      title: "1. Claim Your Restaurant",
      description: "Verify ownership of your restaurant with business documents and contact information.",
      details: ["Business verification process", "Upload required documents", "Phone & email confirmation"]
    },
    {
      icon: Users,
      title: "2. Get Discovered",
      description: "Food lovers in your area will discover and recommend your restaurant to their network.",
      details: ["Appear in local searches", "Get organic recommendations", "Build community presence"]
    },
    {
      icon: Star,
      title: "3. Track Performance",
      description: "Monitor referrals, conversions, and customer acquisition through your dashboard.",
      details: ["Real-time analytics", "Referral tracking", "Conversion metrics"]
    },
    {
      icon: DollarSign,
      title: "4. Reward Success",
      description: "Compensate top recommenders and build lasting relationships with your advocates.",
      details: ["Flexible commission rates", "Automated payouts", "Relationship building"]
    }
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: "Increased Foot Traffic",
      description: "Get more customers through trusted word-of-mouth recommendations from verified food lovers."
    },
    {
      icon: Shield,
      title: "Quality Referrals",
      description: "All recommenders are verified users with reputation scores, ensuring quality leads."
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Track performance, identify top referrers, and optimize your marketing spend."
    },
    {
      icon: UserCheck,
      title: "Community Building",
      description: "Build a network of loyal advocates who genuinely love your restaurant."
    },
    {
      icon: Clock,
      title: "24/7 Marketing",
      description: "Your advocates work around the clock, recommending you whenever opportunities arise."
    },
    {
      icon: Award,
      title: "Cost Effective",
      description: "Only pay for successful conversions - no upfront costs or monthly fees."
    }
  ];

  const stats = [
    { number: "73%", label: "Average increase in new customers" },
    { number: "4.2x", label: "Higher conversion rate vs traditional ads" },
    { number: "$2.40", label: "Average cost per acquisition" },
    { number: "89%", label: "Restaurant owner satisfaction rate" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              C
            </div>
            <span className="text-xl font-bold">Cravlr for Restaurants</span>
          </div>
          <Button onClick={() => navigate('/auth/business')} size="sm">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Turn Food Lovers Into Your
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"> Marketing Team</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Connect with passionate food enthusiasts who love discovering and sharing great restaurants. 
            Only pay when they bring you real customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/auth/business')} size="lg" className="text-lg px-8">
              Claim Your Restaurant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8" onClick={() => navigate('/sample-accounts')}>
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A simple 4-step process to start growing your restaurant through community recommendations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="relative group hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <step.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Restaurants Love Cravlr</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform passionate food lovers into your most effective marketing channel
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="flex justify-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium mb-6">
                "Cravlr brought us 40+ new customers in the first month. The referrals are high-quality - 
                people who actually come in and become regulars. It's like having a team of food bloggers 
                working for us."
              </blockquote>
              <div className="space-y-1">
                <div className="font-semibold">Maria Rodriguez</div>
                <div className="text-muted-foreground">Owner, Bella Vista Italian Kitchen</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Grow Your Restaurant?</h2>
          <p className="text-xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
            Join hundreds of restaurants already using Cravlr to build their community and increase foot traffic.
            No setup fees, no monthly costs - only pay for results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/auth/business')} 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8"
            >
              Claim Your Restaurant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" 
              onClick={() => navigate('/sample-accounts')}
            >
              See Demo Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex justify-center gap-8 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate('/welcome')} className="hover:text-primary transition-colors">
              Back to Welcome
            </button>
            <button onClick={() => navigate('/sample-accounts')} className="hover:text-primary transition-colors">
              Sample Accounts
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2024 Cravlr. Connecting restaurants with their community.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorks;