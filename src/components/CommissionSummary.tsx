import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, CheckCircle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CommissionEntry {
  click_id: string;
  recommender_name: string;
  clicked_at: string;
  visit_confirmed_at: string;
  conversion_value: number;
  commission_rate: number;
  commission_amount?: number;
  commission_paid: boolean;
  recommendation_id: string;
  recommender_id: string;
  restaurant_name: string;
  restaurant_address: string;
  place_id: string;
  converted: boolean;
  visit_date?: string;
  spend_amount?: number;
  business_notes?: string;
}

interface CommissionSummaryProps {
  userId: string;
}

export function CommissionSummary({ userId }: CommissionSummaryProps) {
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [unpaidTotal, setUnpaidTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommissions();
  }, [userId]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      // Fetch commission data
      const { data, error } = await supabase
        .from('view_business_commissions')
        .select('*')
        .eq('user_id', userId)
        .order('visit_confirmed_at', { ascending: false });

      if (error) throw error;
      setCommissions(data || []);

      // Fetch unpaid total
      const { data: unpaidData, error: unpaidError } = await supabase
        .rpc('get_unpaid_commissions', { business_user_id: userId });

      if (unpaidError) throw unpaidError;
      
      // Calculate unpaid total from the data
      const total = Array.isArray(unpaidData) 
        ? unpaidData.reduce((sum, item) => sum + (item.commission_amount || 0), 0)
        : 0;
      setUnpaidTotal(total);
    } catch (error: any) {
      console.error('Error fetching commissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load commission data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (clickId: string) => {
    try {
      const { error } = await supabase
        .from('referral_clicks')
        .update({
          commission_paid: true,
          commission_paid_at: new Date().toISOString()
        })
        .eq('id', clickId);

      if (error) throw error;

      toast({
        title: 'Payment recorded',
        description: 'Commission marked as paid',
      });

      fetchCommissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Unpaid Total Alert */}
      {unpaidTotal > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Outstanding Commission</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ${unpaidTotal.toFixed(2)}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commission Summary
          </CardTitle>
          <CardDescription>
            Track all confirmed visits and their commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No confirmed visits yet</p>
              <p className="text-sm mt-2">
                Commissions will appear here when you confirm customer visits
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((comm) => (
                <div
                  key={comm.click_id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {comm.recommender_name || 'Anonymous'}
                      </span>
                      <Badge variant={comm.commission_paid ? 'default' : 'secondary'}>
                        {comm.commission_paid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Clicked: {format(new Date(comm.clicked_at), 'MMM d, yyyy')}
                      </div>
                      {comm.visit_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Visited: {format(new Date(comm.visit_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>

                    {comm.business_notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {comm.business_notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Spend</p>
                      <p className="font-medium">
                        ${(comm.spend_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Commission</p>
                      <p className="text-lg font-bold">
                        ${(comm.commission_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    {!comm.commission_paid && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkPaid(comm.click_id)}
                        className="mt-2"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
