import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Trophy } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { requests, dashboard } = useUnreadCounts();
  
  const isHome = location.pathname === '/' || location.pathname === '/welcome';
  const isRequests = location.pathname === '/browse-requests';
  const isDashboard = location.pathname === '/dashboard';

  const markRequestsAsRead = async () => {
    if (!user || requests === 0) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('requester_id', user.id)
      .eq('read', false)
      .eq('type', 'new_request');
  };

  const markDashboardAsRead = async () => {
    if (!user || dashboard === 0) return;
    const dashboardTypes = ['request_results', 'request_accepted', 'request_declined', 'new_recommendation', 'visit_reminder'];
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('requester_id', user.id)
      .eq('read', false)
      .in('type', dashboardTypes);
  };

  const handleRequestsClick = () => {
    markRequestsAsRead();
    navigate("/browse-requests");
  };

  const handleDashboardClick = () => {
    markDashboardAsRead();
    navigate("/dashboard");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            isHome ? 'bg-primary/10' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Home className={`h-5 w-5 ${isHome ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
          <span className={`text-xs font-medium ${isHome ? 'text-primary' : 'text-muted-foreground'}`}>Home</span>
        </button>
        
        <button
          onClick={handleRequestsClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            isRequests ? 'bg-primary/10' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <div className="relative">
            <ClipboardList className={`h-5 w-5 ${isRequests ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
            {requests > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
            )}
          </div>
          <span className={`text-xs font-medium ${isRequests ? 'text-primary' : 'text-muted-foreground'}`}>Requests</span>
        </button>
        
        <button
          onClick={handleDashboardClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            isDashboard ? 'bg-primary/10' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <div className="relative">
            <Trophy className={`h-5 w-5 ${isDashboard ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
            {dashboard > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
            )}
          </div>
          <span className={`text-xs font-medium ${isDashboard ? 'text-primary' : 'text-muted-foreground'}`}>Dashboard</span>
        </button>
      </div>
    </nav>
  );
}
