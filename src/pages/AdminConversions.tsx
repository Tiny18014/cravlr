import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, DollarSign, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ReferralClick {
  id: string;
  clicked_at: string;
  restaurant_name: string;
  requester_id: string;
  recommender_id: string;
  click_source: string;
  converted: boolean;
  conversion_at?: string;
  conversion_method?: string;
  conversion_value?: number;
  commission_amount?: number;
  notes?: string;
  // Joined data
  requester_name?: string;
  recommender_name?: string;
  awarded_points?: number;
}

interface ConversionFormData {
  conversion_value: string;
  conversion_method: string;
  commission_rate: string;
  notes: string;
}

const AdminConversions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [unconvertedClicks, setUnconvertedClicks] = useState<ReferralClick[]>([]);
  const [recentConversions, setRecentConversions] = useState<ReferralClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClick, setSelectedClick] = useState<ReferralClick | null>(null);
  const [formData, setFormData] = useState<ConversionFormData>({
    conversion_value: '',
    conversion_method: '',
    commission_rate: '0.10',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchData();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user?.id)
      .single();
    
    setProfile(data);
  };

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch unconverted clicks with separate profile queries
      const { data: unconverted } = await supabase
        .from('referral_clicks')
        .select('*')
        .eq('converted', false)
        .order('clicked_at', { ascending: false })
        .limit(50);

      // Fetch recent conversions
      const { data: converted } = await supabase
        .from('referral_clicks')
        .select('*')
        .eq('converted', true)
        .gte('conversion_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('conversion_at', { ascending: false })
        .limit(50);

      if (unconverted) {
        // Get profile names for unconverted clicks
        const formattedUnconverted = await Promise.all(
          unconverted.map(async (click) => {
            const [requesterProfile, recommenderProfile] = await Promise.all([
              supabase.from('profiles').select('display_name').eq('user_id', click.requester_id).single(),
              supabase.from('profiles').select('display_name').eq('user_id', click.recommender_id).single()
            ]);

            return {
              ...click,
              requester_name: requesterProfile.data?.display_name || 'Unknown',
              recommender_name: recommenderProfile.data?.display_name || 'Unknown'
            };
          })
        );
        setUnconvertedClicks(formattedUnconverted);
      }

      if (converted) {
        // Get profile names and points for converted clicks
        const formattedConverted = await Promise.all(
          converted.map(async (click) => {
            const [requesterProfile, recommenderProfile, pointsEvent] = await Promise.all([
              supabase.from('profiles').select('display_name').eq('user_id', click.requester_id).single(),
              supabase.from('profiles').select('display_name').eq('user_id', click.recommender_id).single(),
              supabase.from('points_events').select('points').eq('referral_click_id', click.id).eq('type', 'conversion_bonus').single()
            ]);

            return {
              ...click,
              requester_name: requesterProfile.data?.display_name || 'Unknown',
              recommender_name: recommenderProfile.data?.display_name || 'Unknown',
              awarded_points: pointsEvent.data?.points || 0
            };
          })
        );
        setRecentConversions(formattedConverted);
      }
    } catch (error) {
      console.error('Error fetching conversion data:', error);
      toast({
        title: "Error",
        description: "Failed to load conversion data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkConversion = async () => {
    if (!selectedClick) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('mark-conversion', {
        body: {
          referral_click_id: selectedClick.id,
          conversion_method: formData.conversion_method,
          conversion_value: parseFloat(formData.conversion_value) || 0,
          commission_rate: parseFloat(formData.commission_rate),
          notes: formData.notes || null
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Conversion marked successfully"
      });

      // Reset form and close dialog
      setFormData({
        conversion_value: '',
        conversion_method: '',
        commission_rate: '0.10',
        notes: ''
      });
      setSelectedClick(null);
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error marking conversion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark conversion",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading conversion data...</div>
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversion Tracking</h1>
          <p className="text-muted-foreground">
            Manage referral conversions and commission tracking
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Conversions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unconvertedClicks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Conversions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentConversions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${recentConversions.reduce((sum, click) => sum + (click.commission_amount || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentConversions.reduce((sum, click) => sum + (click.awarded_points || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unconverted Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Conversions</CardTitle>
          <CardDescription>
            Referral clicks that haven't been marked as converted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Recommender</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unconvertedClicks.map((click) => (
                <TableRow key={click.id}>
                  <TableCell>
                    {format(new Date(click.clicked_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{click.restaurant_name}</TableCell>
                  <TableCell>{click.requester_name}</TableCell>
                  <TableCell>{click.recommender_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{click.click_source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedClick(click)}
                        >
                          Mark Converted
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Mark Conversion</DialogTitle>
                          <DialogDescription>
                            Mark this referral as converted and award commission points
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="conversion_value">Meal Value ($)</Label>
                            <Input
                              id="conversion_value"
                              type="number"
                              step="0.01"
                              placeholder="50.00"
                              value={formData.conversion_value}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                conversion_value: e.target.value
                              }))}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="conversion_method">Conversion Method</Label>
                            <Select 
                              value={formData.conversion_method}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                conversion_method: value
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_person">In Person</SelectItem>
                                <SelectItem value="code">Promo Code</SelectItem>
                                <SelectItem value="call">Phone Call</SelectItem>
                                <SelectItem value="link">Online Link</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="commission_rate">Commission Rate</Label>
                            <Input
                              id="commission_rate"
                              type="number"
                              step="0.01"
                              value={formData.commission_rate}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                commission_rate: e.target.value
                              }))}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                              id="notes"
                              placeholder="Additional notes about this conversion..."
                              value={formData.notes}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                notes: e.target.value
                              }))}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedClick(null)}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleMarkConversion}
                              disabled={submitting || !formData.conversion_method}
                            >
                              {submitting ? 'Marking...' : 'Mark Converted'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {unconvertedClicks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No pending conversions found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversions</CardTitle>
          <CardDescription>
            Successfully converted referrals from the last 90 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Converted</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Recommender</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentConversions.map((click) => (
                <TableRow key={click.id}>
                  <TableCell>
                    {click.conversion_at && format(new Date(click.conversion_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{click.restaurant_name}</TableCell>
                  <TableCell>{click.recommender_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{click.conversion_method}</Badge>
                  </TableCell>
                  <TableCell>${click.conversion_value?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>${click.commission_amount?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    <Badge>{click.awarded_points || 0} pts</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {recentConversions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No recent conversions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConversions;