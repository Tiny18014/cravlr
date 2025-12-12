import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  description?: string;
}

export const SettingsSection = ({ title, icon: Icon, children, description }: SettingsSectionProps) => {
  return (
    <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-9 h-9 rounded-full bg-accent-bubble flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 ml-[46px]">{description}</p>
        )}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};
