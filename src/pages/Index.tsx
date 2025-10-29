import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Bell, Home, ClipboardList, User, Trophy, Star, ArrowRight, CheckCircle2, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/UnifiedNotificationContext";
import { Switch } from "@/components/ui/switch";
import Footer from "@/components/Footer";

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

function HeroCard() {
  return (
    <section className="px-4">
      <div className="relative rounded-3xl bg-gradient-to-br from-[hsl(35,45%,88%)] via-[hsl(35,40%,90%)] to-[hsl(30,38%,92%)] p-10 shadow-xl overflow-hidden">
        {/* Decorative food icons with blur */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-4 right-4 text-4xl opacity-8 blur-[1px]">☕</div>
          <div className="absolute bottom-4 left-4 text-4xl opacity-8 blur-[1px]">🌿</div>
          <div className="absolute top-1/2 left-8 text-3xl opacity-6 blur-[1.5px]">🍜</div>
          <div className="absolute top-1/3 right-10 text-3xl opacity-6 blur-[1.5px]">🥗</div>
          <div className="absolute bottom-1/3 right-6 text-3xl opacity-5 blur-[2px]">🍅</div>
          <div className="absolute top-2/3 left-12 text-2xl opacity-5 blur-[2px]">🫒</div>
        </div>
        
        <div className="text-center relative z-10">
          <h1 className="font-poppins text-4xl font-semibold leading-tight text-[hsl(25,50%,25%)] mb-4">
            What are you craving today?
          </h1>
          <p className="font-nunito text-base text-[hsl(25,35%,40%)] leading-relaxed max-w-md mx-auto mb-10">
            Get real food suggestions from locals who know what tastes amazing.
          </p>

          <div className="space-y-4">
            <Link
              to="/request-food"
              className="block w-full rounded-2xl bg-gradient-to-r from-[hsl(9,85%,58%)] to-[hsl(9,90%,52%)] py-5 text-center text-base font-semibold text-white shadow-lg hover:shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] font-poppins"
            >
              Find Food Recommendations
            </Link>

            <Link
              to="/browse-requests"
              className="block w-full rounded-2xl border-2 border-[hsl(88,25%,45%)] bg-white/60 backdrop-blur-sm py-5 text-center text-base font-semibold text-[hsl(25,45%,30%)] shadow-md hover:bg-[hsl(88,25%,45%)]/10 hover:shadow-lg transition-all hover:scale-[1.03] active:scale-[0.98] font-poppins"
            >
              Share Your Favorites
            </Link>
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="mx-auto max-w-md pb-28">
      <Header onSignOut={onSignOut} userName={userName} />
      <HeroCard />
      <HowItWorks />
      <RewardsSection pointsThisMonth={pointsThisMonth} goalThisMonth={goalThisMonth} progress={progress} />
      <BottomNav />
      <Footer />
    </main>
  );
}

export default Index;