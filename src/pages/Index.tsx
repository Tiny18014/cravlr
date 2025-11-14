import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Home, ClipboardList, Trophy, Star, ArrowRight, CheckCircle2, Sparkles, MessageCircle, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { BecomeRecommenderModal } from "@/components/onboarding/BecomeRecommenderModal";
import { useUserRoles } from "@/hooks/useUserRoles";
import { DashboardHeader } from "@/components/DashboardHeader";

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


function HeroCard({ onRecommendClick }: { onRecommendClick: () => void }) {
  return (
    <section className="px-6 pt-6">
      <div className="relative rounded-3xl bg-gradient-to-br from-primary/5 via-background to-primary/5 p-10 overflow-hidden">
        
        <div className="relative text-center">
          <h1 className="text-4xl font-semibold text-foreground mb-3 tracking-tight">
            What are you craving today?
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto mb-8">
            Get trusted food suggestions from locals.
          </p>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Link
              to="/request-food"
              className="w-full rounded-full bg-gradient-to-r from-primary to-primary-dark py-3.5 px-6 text-center text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Request Food
            </Link>
            <button
              onClick={onRecommendClick}
              className="w-full rounded-full bg-gradient-to-r from-primary to-primary-dark py-3.5 px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
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
  return (
    <section className="px-6 py-6">
      <h2 className="text-xl font-semibold text-foreground mb-6 text-center">How It Works</h2>
      <div className="space-y-4 max-w-lg mx-auto">
        <StepCard
          number={1}
          icon={<MessageCircle className="h-5 w-5" />}
          title="Post a Request"
          description="Looking for the best pizza? Share what you're craving and where you are."
        />
        <StepCard
          number={2}
          icon={<Gift className="h-5 w-5" />}
          title="Get Recommendations"
          description="Locals who know the area will send you personalized suggestions."
        />
        <StepCard
          number={3}
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Discover & Enjoy"
          description="Visit the spots, share your experience, and earn rewards for helping others!"
        />
      </div>
    </section>
  );
}

function StepCard({ number, icon, title, description }: { number: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 border border-border/50">
      <div className="relative flex-shrink-0">
        <div className="h-11 w-11 rounded-full bg-primary/10 grid place-items-center text-primary">
          {icon}
        </div>
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">
          {number}
        </div>
      </div>
      <div className="pt-1">
        <h3 className="font-semibold text-sm text-card-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
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
  const [userName, setUserName] = useState(user?.email?.split('@')[0] || "there");
  const [isRecommenderModalOpen, setIsRecommenderModalOpen] = useState(false);
  const { hasRole } = useUserRoles();

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-background">
      <DashboardHeader onSignOut={onSignOut} userName={userName} />
      <main className="flex-1 flex flex-col justify-center space-y-8">
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