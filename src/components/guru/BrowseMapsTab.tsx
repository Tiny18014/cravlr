import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function BrowseMapsTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <p>Maps browsing is temporarily unavailable.</p>
        </div>
      </CardContent>
    </Card>
  );
}
