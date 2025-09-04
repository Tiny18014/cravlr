import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Search, Bell, Home, ClipboardList, User, Trophy, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import ActiveRequestsList from "@/components/ActiveRequestsList";

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
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto">
          C
        </div>
        <h1 className="text-4xl font-bold">Welcome to Cravlr</h1>
        <p className="text-lg text-muted-foreground">
          Discover amazing local restaurants through food requests and recommendations from your community.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link to="/auth">Get Started</Link>
        </Button>
        <div className="space-y-3 text-sm text-muted-foreground">
          <h3 className="font-semibold">How it works:</h3>
          <div className="space-y-2">
            <p>🍕 <strong>Request:</strong> Ask for food recommendations in your area</p>
            <p>🎯 <strong>Recommend:</strong> Help others discover great restaurants</p>
            <p>⭐ <strong>Earn Points:</strong> Build your reputation by giving helpful suggestions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div aria-hidden className="h-9 w-9 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-semibold">
          C
        </div>
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">Welcome</p>
          <p className="text-sm font-medium">Back, foodie! 🍽️</p>
        </div>
      </div>
      <button 
        onClick={onSignOut}
        aria-label="Notifications" 
        className="relative rounded-full p-2 hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-4 min-w-[16px] rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground text-center">
          3
        </span>
      </button>
    </header>
  );
}

function HeroCard() {
  return (
    <section className="px-4">
      <div className="rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-5 shadow-lg">
        <h1 className="text-2xl font-extrabold leading-snug">Ready to find great food?</h1>
        <p className="mt-1 text-primary-foreground/80">Create a request or help locals discover amazing restaurants.</p>

        <div className="mt-4 flex gap-3">
          <Link
            to="/request-food"
            className="flex-1 rounded-2xl bg-background p-4 text-left text-foreground shadow-sm hover:shadow transition"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Request Food</p>
                <p className="text-xs text-muted-foreground">Get tailored recs fast</p>
              </div>
            </div>
          </Link>

          <Link
            to="/browse-requests"
            className="flex-1 rounded-2xl bg-background/10 p-4 text-left backdrop-blur hover:bg-background/15 transition"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-background/15">
                <Search className="h-5 w-5 text-primary-foreground" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Give Recommendations</p>
                <p className="text-xs text-primary-foreground/70">Help people nearby</p>
              </div>
            </div>
          </Link>
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
  // Mock user data - you can replace with actual data from your store/profile query
  const userFirstName = "foodie";
  const pointsThisMonth = 0;
  const goalThisMonth = 500;
  const progress = Math.min(100, Math.round((pointsThisMonth / goalThisMonth) * 100));

  return (
    <main className="mx-auto max-w-md pb-28">
      <Header onSignOut={onSignOut} />
      <HeroCard />
      
      {/* Active Requests Section */}
      <section className="mt-5 px-4">
        <ActiveRequestsList 
          limit={3} 
          compact={true} 
          title="Help Others Find Food"
        />
      </section>

      <HowItWorks />
      <RewardsSection pointsThisMonth={pointsThisMonth} goalThisMonth={goalThisMonth} progress={progress} />
      <BottomNav />
    </main>
  );
}

export default Index;