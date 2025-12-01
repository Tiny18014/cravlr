import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Trophy } from 'lucide-react';

export function DashboardBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/welcome';
  const isRequests = location.pathname === '/browse-requests';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => navigate("/welcome")}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            isHome ? 'bg-primary/10' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Home className={`h-5 w-5 ${isHome ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
          <span className={`text-xs font-medium ${isHome ? 'text-primary' : 'text-muted-foreground'}`}>Home</span>
        </button>
        
        <button
          onClick={() => navigate("/browse-requests")}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            isRequests ? 'bg-primary/10' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <ClipboardList className={`h-5 w-5 ${isRequests ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
          <span className={`text-xs font-medium ${isRequests ? 'text-primary' : 'text-muted-foreground'}`}>Requests</span>
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
