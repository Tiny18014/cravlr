import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, User, Settings, LogOut, LayoutDashboard, FileText, Star, Gift, MessageSquare } from 'lucide-react';
import { useNotifications } from '@/contexts/UnifiedNotificationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  onSignOut: () => void;
  userName: string;
}

export function DashboardHeader({ onSignOut, userName }: DashboardHeaderProps) {
  const { dnd, setDnd } = useNotifications();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-5 border-b border-border/50">
      <div className="flex items-center gap-3">
        <div 
          aria-hidden 
          className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center font-semibold text-primary text-base"
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-foreground">
            <span className="font-semibold">{userName}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          className="rounded-full p-2 hover:bg-primary/5 transition-colors"
          aria-label="Notifications"
          onClick={() => setDnd(!dnd)}
        >
          {dnd ? (
            <BellOff className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full p-2 hover:bg-primary/5 transition-colors focus:outline-none">
            <User className="h-5 w-5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard?tab=requests')}>
              <FileText className="mr-2 h-4 w-4" />
              My Requests
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/dashboard?tab=recommendations')}>
              <Star className="mr-2 h-4 w-4" />
              My Recommendations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/dashboard?tab=points')}>
              <Gift className="mr-2 h-4 w-4" />
              Points & Rewards
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
