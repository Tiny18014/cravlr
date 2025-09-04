import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Search, Bell, Gift, Send, Sparkles, ChevronRight, Home, ClipboardList, MessageCircle, User } from "lucide-react";

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

function AuthenticatedView({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <Header onSignOut={onSignOut} />
      <main className="px-4 pb-28 max-w-md mx-auto">
        <HeroCard />
        <QuickActions />
        <HowItWorks />
        <InviteFriends />
      </main>
      <BottomNav />
    </div>
  );
}

function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-background/75 backdrop-blur border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-wide">C</div>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Welcome</p>
            <p className="text-sm font-medium">Back, foodie! 🍽️</p>
          </div>
        </div>
        <button 
          onClick={onSignOut}
          className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-muted hover:bg-muted/80 transition"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-5 text-center">3</span>
        </button>
      </div>
    </header>
  );
}

function HeroCard() {
  return (
    <section className="mt-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-5">
        <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-background/10 blur-2xl" />
        <div className="absolute -top-8 -left-10 h-32 w-32 rounded-full bg-background/10 blur-xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Ready to find great food?</h1>
          <p className="mt-1 text-primary-foreground/90">Create a request or help locals discover amazing restaurants.</p>
          <div className="mt-4 flex gap-2">
            <Link 
              to="/request-food" 
              className="inline-flex items-center gap-2 rounded-2xl bg-background text-foreground px-4 py-3 font-medium shadow-sm active:scale-[.98] transition-transform"
            >
              <Plus className="h-5 w-5" /> Request Food
            </Link>
            <Link 
              to="/browse-requests" 
              className="inline-flex items-center gap-2 rounded-2xl bg-background/20 backdrop-blur px-4 py-3 font-medium text-primary-foreground ring-1 ring-inset ring-background/40 active:scale-[.98] transition-transform"
            >
              <Search className="h-5 w-5" /> Give Recommendations
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="mt-6 grid grid-cols-2 gap-3">
      <ActionCard
        title="Request"
        subtitle="Let locals help"
        href="/request-food"
        icon={<Plus className="h-5 w-5" />}
      />
      <ActionCard
        title="Recommend"
        subtitle="Share a favorite"
        href="/browse-requests"
        icon={<Search className="h-5 w-5" />}
      />
    </section>
  );
}

function ActionCard({ title, subtitle, icon, href }: { title: string; subtitle: string; icon: React.ReactNode; href: string }) {
  return (
    <Link
      to={href}
      className="group rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border hover:shadow-md transition flex flex-col gap-4"
    >
      <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-sm text-muted-foreground">
        Open <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function HowItWorks() {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">How it works</h2>
      <ol className="grid grid-cols-3 gap-3">
        <Step index={1} title="Ask" desc="Say what you crave" />
        <Step index={2} title="Get" desc="Local recs roll in" />
        <Step index={3} title="Enjoy" desc="Pick & go eat" />
      </ol>
    </section>
  );
}

function Step({ index, title, desc }: { index: number; title: string; desc: string }) {
  return (
    <li className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
        {index}
      </div>
      <p className="mt-2 font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </li>
  );
}

function InviteFriends() {
  return (
    <section className="mt-10">
      <div className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/20 text-accent-foreground flex items-center justify-center">
            <Gift className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Invite friends, earn perks</p>
            <p className="text-sm text-muted-foreground">Share Cravlr with your foodie crew. Get bonus points when they join and make a request.</p>
            <div className="mt-3 flex gap-2">
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              >
                <Send className="h-4 w-4" /> Invite now
              </Link>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium"
              >
                <Sparkles className="h-4 w-4" /> See perks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-4 inset-x-0 z-20">
      <div className="mx-auto max-w-md px-4">
        <div className="grid grid-cols-4 gap-3 rounded-2xl bg-background/90 backdrop-blur ring-1 ring-border shadow-lg p-2">
          <NavItem href="/" label="Home" icon={<Home className="h-5 w-5" />} active />
          <NavItem href="/browse-requests" label="Requests" icon={<ClipboardList className="h-5 w-5" />} />
          <NavItem href="/request-food" label="Request" icon={<MessageCircle className="h-5 w-5" />} />
          <NavItem href="/dashboard" label="Profile" icon={<User className="h-5 w-5" />} />
        </div>
      </div>
    </nav>
  );
}

function NavItem({ href, label, icon, active = false }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link
      to={href}
      className={[
        "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default Index;