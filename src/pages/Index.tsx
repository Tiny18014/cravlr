import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Bell, Home, ClipboardList, User, Trophy, Star, ArrowRight, CheckCircle2, BellOff, Sparkles, MessageCircle, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/UnifiedNotificationContext";
import { Switch } from "@/components/ui/switch";
import Footer from "@/components/Footer";
import { BecomeRecommenderModal } from "@/components/onboarding/BecomeRecommenderModal";
import { useUserRoles } from "@/hooks/useUserRoles";

const Index = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <UnauthenticatedView />;
  }

  return <AuthenticatedView onSignOut={signOut} />;
};

function UnauthenticatedView() {
  const navigate = useNavigate();
  
  // Redirect to welcome page instead of showing unauthenticated view
  React.useEffect(() => {
    navigate('/welcome');
  }, [navigate]);

  return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
}

function Header({ onSignOut, userName }: { onSignOut: () => void; userName: string }) {
  const { dnd, setDnd } = useNotifications();
  
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background-soft">
      <div className="flex items-center gap-3">
        <div 
          aria-hidden 
          className="h-11 w-11 rounded-full bg-accent-bubble grid place-items-center font-semibold text-primary text-lg"
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-body font-medium text-foreground">
            Welcome back, <span className="font-semibold">{userName}!</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Do Not Disturb Toggle */}
        <button 
          className="rounded-xl p-2.5 hover:bg-accent-bubble transition-colors"
          aria-label="Do Not Disturb"
          onClick={() => setDnd(!dnd)}
        >
          {dnd ? (
            <BellOff className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5 text-text-medium" />
          )}
        </button>
        <button 
          onClick={onSignOut}
          aria-label="Profile" 
          className="rounded-xl p-2.5 hover:bg-accent-bubble transition-colors"
        >
          <User className="h-5 w-5 text-text-medium" />
        </button>
      </div>
    </header>
  );
}

function HeroCard({ onRecommendClick }: { onRecommendClick: () => void }) {
  return (
    <section className="px-6">
      <div className="relative rounded-2xl bg-gradient-to-b from-background-soft to-background-warm p-8 shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 opacity-[0.06]">
          <Sparkles className="h-16 w-16 text-primary" />
        </div>
        
        <div className="relative text-center">
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            What are you craving today?
          </h1>
          <p className="text-body text-text-medium leading-relaxed max-w-md mx-auto mb-8">
            Get trusted food suggestions from locals.
          </p>

          <div className="space-y-3 max-w-sm mx-auto">
            <Link
              to="/request-food"
              className="block w-full rounded-2xl bg-gradient-to-br from-primary to-primary-gradient py-4 text-center text-body font-semibold text-primary-foreground shadow-[0_4px_12px_rgba(160,50,114,0.25)] hover:shadow-[0_6px_20px_rgba(160,50,114,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Request Food
            </Link>

            <button
              onClick={onRecommendClick}
              className="block w-full rounded-2xl bg-background-warm border-[1.5px] border-primary py-4 text-center text-body font-semibold text-primary hover:bg-accent-bubble transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Recommend Food
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: MessageCircle,
      title: "Request",
      description: "Tell locals what you're craving.",
    },
    {
      icon: Star,
      title: "Recommend",
      description: "Food lovers suggest places with notes & vibes.",
    },
    {
      icon: Gift,
      title: "Earn",
      description: "Earn points for great recommendations.",
    },
  ];

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">How It Works</h2>
        <p className="text-body text-text-medium">Three simple steps to discover amazing food</p>
      </div>

      <div className="grid gap-4 max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-4 bg-card rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-border"
          >
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-accent-bubble flex items-center justify-center">
              <step.icon className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-small text-text-medium leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 safe-area-inset-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all bg-accent-bubble"
        >
          <Home className="h-5 w-5 text-primary" strokeWidth={2} />
          <span className="text-xs font-medium text-primary">Home</span>
        </button>
        
        <button
          onClick={() => navigate("/browse-requests")}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all opacity-60 hover:opacity-100"
        >
          <ClipboardList className="h-5 w-5 text-text-medium" strokeWidth={2} />
          <span className="text-xs font-medium text-text-medium">Requests</span>
        </button>
        
        <button
          onClick={() => navigate("/dashboard")}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all opacity-60 hover:opacity-100"
        >
          <Trophy className="h-5 w-5 text-text-medium" strokeWidth={2} />
          <span className="text-xs font-medium text-text-medium">Dashboard</span>
        </button>
      </div>
    </nav>
  );
}

function AuthenticatedView({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("there");
  const [isRecommenderModalOpen, setIsRecommenderModalOpen] = useState(false);
  const { hasRole } = useUserRoles();

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.display_name) setUserName(data.display_name);
        });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      supabase
        .from("business_claims")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle()
        .then(({ data }) => {
          if (data) navigate("/business/dashboard");
        });
    }
  }, [user, navigate]);

  const handleRecommendClick = () => {
    if (hasRole('recommender')) {
      navigate("/browse-requests");
    } else {
      setIsRecommenderModalOpen(true);
    }
  };

  const handleRecommenderContinue = () => {
    setIsRecommenderModalOpen(false);
    navigate("/browse-requests");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onSignOut={onSignOut} userName={userName} />
      
      <main className="space-y-8 py-6">
        <HeroCard onRecommendClick={handleRecommendClick} />
        <HowItWorks />
      </main>

      <BottomNav />

      <BecomeRecommenderModal
        open={isRecommenderModalOpen}
        onOpenChange={setIsRecommenderModalOpen}
        onContinue={handleRecommenderContinue}
      />
    </div>
  );
}

export default Index;