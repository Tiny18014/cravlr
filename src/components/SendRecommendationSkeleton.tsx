import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const SendRecommendationSkeleton = React.memo(() => (
  <div className="min-h-screen bg-background overflow-y-auto">
    <header className="border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" disabled>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Skeleton className="h-8 w-48" />
      </div>
    </header>
    
    <main className="container mx-auto px-4 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Request Details Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendation Form Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Restaurant Search */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Skeleton className="h-10 w-full sm:flex-1" />
                <Skeleton className="h-10 w-full sm:flex-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
));

SendRecommendationSkeleton.displayName = 'SendRecommendationSkeleton';
