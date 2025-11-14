import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Trophy } from 'lucide-react';

export function DashboardBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 safe-area-inset-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            !isDashboard ? 'opacity-60 hover:opacity-100' : ''
          }`}
        >
          <Home className={`h-5 w-5 ${!isDashboard ? 'text-muted-foreground' : 'text-primary'}`} strokeWidth={2} />
          <span className={`text-xs font-medium ${!isDashboard ? 'text-muted-foreground' : 'text-primary'}`}>Home</span>
        </button>
        
        <button
          onClick={() => navigate("/browse-requests")}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all opacity-60 hover:opacity-100"
        >
          <ClipboardList className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs font-medium text-muted-foreground">Requests</span>
        </button>
        
        <button
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            isDashboard ? 'bg-primary/10' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Trophy className={`h-5 w-5 ${isDashboard ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
          <span className={`text-xs font-medium ${isDashboard ? 'text-primary' : 'text-muted-foreground'}`}>Dashboard</span>
        </button>
      </div>
    </nav>
  );
}
