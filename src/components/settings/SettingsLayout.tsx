import React, { useState } from 'react';
import { ChevronLeft, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export interface SettingsNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface SettingsLayoutProps {
  navItems: SettingsNavItem[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export const SettingsLayout = ({
  navItems,
  activeSection,
  onSectionChange,
  children,
  headerContent,
}: SettingsLayoutProps) => {
  const isMobile = useIsMobile();
  const [showContent, setShowContent] = useState(false);

  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId);
    if (isMobile) {
      setShowContent(true);
    }
  };

  const handleBackClick = () => {
    setShowContent(false);
  };

  // Mobile: show either nav list or content
  if (isMobile) {
    if (showContent) {
      return (
        <div className="flex flex-col min-h-0">
          {/* Mobile back header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="p-1 h-auto"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium text-foreground">
              {navItems.find(item => item.id === activeSection)?.label || 'Settings'}
            </span>
          </div>
          {/* Mobile content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {children}
          </div>
        </div>
      );
    }

    // Mobile nav list
    return (
      <div className="flex flex-col">
        {headerContent && (
          <div className="px-4 py-4">
            {headerContent}
          </div>
        )}
        <nav className="flex flex-col">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 text-left transition-colors border-b border-border",
                  "hover:bg-muted/50",
                  activeSection === item.id && "bg-muted/30"
                )}
              >
                {Icon && (
                  <div className="w-9 h-9 rounded-full bg-accent-bubble flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground ml-auto rotate-180" />
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Desktop: two-column layout
  return (
    <div className="flex gap-6 min-h-[calc(100vh-200px)]">
      {/* Left navigation - fixed, non-scrolling */}
      <aside className="w-56 flex-shrink-0">
        <div className="sticky top-24">
          {headerContent && (
            <div className="mb-4">
              {headerContent}
            </div>
          )}
          <nav className="bg-card rounded-xl border border-border overflow-hidden">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    index !== 0 && "border-t border-border",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  {Icon && (
                    <Icon className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                  )}
                  <span className={cn(
                    "text-sm",
                    isActive && "font-medium"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Right content panel - scrolls independently */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
