import React from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SettingsRowProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  toggle?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  danger?: boolean;
  className?: string;
}

export const SettingsRow = ({
  label,
  description,
  icon: Icon,
  iconColor,
  onClick,
  rightElement,
  showChevron = false,
  toggle,
  danger = false,
  className,
}: SettingsRowProps) => {
  const isClickable = !!onClick;
  
  const content = (
    <div
      className={cn(
        "flex items-center justify-between py-4 px-4 -mx-4 rounded-xl transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
            danger ? "bg-destructive/10" : "bg-accent-bubble"
          )}>
            <Icon className={cn(
              "h-4.5 w-4.5",
              danger ? "text-destructive" : iconColor || "text-primary"
            )} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium",
            danger ? "text-destructive" : "text-foreground"
          )}>
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {rightElement}
        {toggle && (
          <Switch
            checked={toggle.checked}
            onCheckedChange={toggle.onChange}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {showChevron && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  return content;
};
