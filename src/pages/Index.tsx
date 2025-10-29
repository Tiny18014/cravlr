import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Bell, Home, ClipboardList, User, Trophy, Star, ArrowRight, CheckCircle2, BellOff } from "lucide-react";
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
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div aria-hidden className="h-9 w-9 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-semibold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <p className="text-sm font-medium">{userName}! 🍽️</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Do Not Disturb Toggle */}
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <div className="flex items-center gap-1.5">
            {dnd ? <BellOff className="h-4 w-4 text-muted-foreground" /> : <Bell className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">DND</span>
          </div>
          <Switch
            checked={dnd}
            onCheckedChange={setDnd}
            aria-label="Do Not Disturb"
          />
        </div>
        <button 
          onClick={onSignOut}
          aria-label="Sign out" 
          className="rounded-full p-2 hover:bg-muted text-muted-foreground"
        >
          <User className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function HeroCard({ onRecommendClick }: { onRecommendClick: () => void }) {
  return (
    <section className="px-4">
      <div className="relative rounded-3xl bg-gradient-to-br from-[#F5F1E8] to-[#FAF6F0] p-12 shadow-lg overflow-hidden">
        <div className="text-center">
          <h1 className="font-poppins text-4xl font-semibold leading-tight text-[#3E2F25] mb-4">
            What are you craving today?
          </h1>
          <p className="font-nunito text-base text-[#6B5B52] leading-relaxed max-w-md mx-auto mb-12">
            Get trusted food suggestions from locals who know what tastes amazing.
          </p>

          <div className="space-y-4 max-w-sm mx-auto">
            <Link
              to="/request-food"
              className="block w-full rounded-2xl bg-gradient-to-r from-[#FF6A3D] to-[#FF3B30] py-4 text-center text-base font-semibold text-white shadow-[0_4px_14px_rgba(255,59,48,0.25)] hover:shadow-[0_6px_20px_rgba(255,59,48,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] font-poppins"
            >
              Request Food
            </Link>

            <button
              onClick={onRecommendClick}
              className="block w-full rounded-2xl border-2 border-[#9DBF70] bg-white py-4 text-center text-base font-semibold text-[#3E2F25] hover:bg-[#9DBF70]/10 transition-all hover:scale-[1.02] active:scale-[0.98] font-poppins"
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
    <section className="mt-5 px-4">
      <h2 className="mb-3 text-base font-semibold">How it works</h2>

      <ol className="grid gap-3">
        <li className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
          <div className="flex-1">
            <p className="text-sm font-medium">Request</p>
            <p className="text-xs text-muted-foreground">Tell locals what you're craving (e.g., "best sushi tonight").</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </li>
        <li className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
          <div className="flex-1">
            <p className="text-sm font-medium">Recommend</p>
            <p className="text-xs text-muted-foreground">Locals suggest places with notes, links, and vibes.</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </li>
        <li className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
          <div className="flex-1">
            <p className="text-sm font-medium">Earn</p>
            <p className="text-xs text-muted-foreground">Great recs earn points. Redeem for perks and gift cards.</p>
          </div>
          <Trophy className="h-5 w-5 text-yellow-500" />
        </li>
      </ol>
    </section>
  );
}

function RewardsSection({ pointsThisMonth, goalThisMonth, progress }: { pointsThisMonth: number; goalThisMonth: number; progress: number }) {
  return (
    <section className="mt-5 px-4">
      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-100">
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Your rewards</p>
            <p className="text-xs text-muted-foreground">Points reset monthly. Hit your goal for bonus perks.</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pointsThisMonth} pts</span>
            <span>Goal {goalThisMonth} pts</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            to="/browse-requests"
            className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground shadow hover:opacity-95"
          >
            Earn points now
          </Link>
          <Link
            to="/rewards"
            className="rounded-xl border bg-background px-4 py-3 text-center text-sm font-medium hover:bg-muted"
          >
            View rewards
          </Link>
        </div>
      </div>
    </section>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-3 mx-auto max-w-md px-4">
      <div className="flex items-center justify-between rounded-3xl border bg-background/95 p-2 shadow-lg backdrop-blur">
        <Link to="/" className="flex-1 rounded-2xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">Home</Link>
        <Link to="/browse-requests" className="flex-1 py-3 text-center text-sm text-muted-foreground">Requests</Link>
        <Link to="/dashboard" className="flex-1 py-3 text-center text-sm text-muted-foreground">My Dashboard</Link>
      </div>
    </nav>
  );
}

function AuthenticatedView({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<{ display_name: string; persona?: string; is_admin?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecommenderModal, setShowRecommenderModal] = useState(false);
  const { roles, hasRole, refetch: refetchRoles } = useUserRoles();

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, persona, is_admin')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to email-based display name
        setUserProfile({ 
          display_name: user.email?.split('@')[0] || 'foodie',
          persona: 'both',
          is_admin: false
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Check if user has business claims and redirect accordingly
  useEffect(() => {
    if (!loading && userProfile && user) {
      // Check if user has verified business claims
      const checkBusinessAccounts = async () => {
        const { data: businessClaims } = await supabase
          .from('business_claims')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'verified')
          .limit(1);
        
        if (businessClaims && businessClaims.length > 0) {
          const currentPath = window.location.pathname;
          if (currentPath === '/') {
            console.log('🏢 Redirecting business user to dashboard...');
            navigate('/business/dashboard', { replace: true });
          }
        }
      };
      
      checkBusinessAccounts();
    }
  }, [loading, userProfile, user, navigate]);

  // Mock user data for rewards - you can replace with actual data from your store/profile query
  const pointsThisMonth = 0;
  const goalThisMonth = 500;
  const progress = Math.min(100, Math.round((pointsThisMonth / goalThisMonth) * 100));

  const userName = userProfile?.display_name || user?.email?.split('@')[0] || 'foodie';

  const handleRecommendClick = async () => {
    await refetchRoles();
    if (hasRole('recommender')) {
      navigate('/browse-requests');
    } else {
      setShowRecommenderModal(true);
    }
  };

  const handleRecommenderContinue = () => {
    setShowRecommenderModal(false);
    navigate('/onboarding/recommender?upgrade=true');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="mx-auto max-w-md pb-28">
      <Header onSignOut={onSignOut} userName={userName} />
      <HeroCard onRecommendClick={handleRecommendClick} />
      <HowItWorks />
      <RewardsSection pointsThisMonth={pointsThisMonth} goalThisMonth={goalThisMonth} progress={progress} />
      <BottomNav />
      <Footer />
      
      <BecomeRecommenderModal
        open={showRecommenderModal}
        onOpenChange={setShowRecommenderModal}
        onContinue={handleRecommenderContinue}
      />
    </main>
  );
}

export default Index;