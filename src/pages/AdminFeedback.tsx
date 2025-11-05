import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function AdminFeedback() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Feedback</CardTitle>
          <CardDescription>This feature is temporarily unavailable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>Feedback admin panel is under maintenance.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
