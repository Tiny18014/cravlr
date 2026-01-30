import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const SettingsAccountCardSkeleton = () => (
  <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Profile Photo Skeleton */}
      <div className="flex-shrink-0 flex justify-center sm:justify-start">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>

      {/* Info Section Skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        {/* XP Progress Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  </div>
);

export const SettingsSectionSkeleton = () => (
  <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div>
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const SettingsNavSkeleton = () => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
);

export const SettingsPageSkeleton = () => (
  <div className="flex gap-6">
    {/* Left navigation skeleton - desktop only */}
    <aside className="w-56 flex-shrink-0 hidden md:block">
      <SettingsNavSkeleton />
    </aside>

    {/* Right content skeleton */}
    <main className="flex-1 min-w-0 space-y-6">
      <SettingsAccountCardSkeleton />
      <SettingsSectionSkeleton />
    </main>
  </div>
);
